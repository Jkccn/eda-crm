import { NextResponse } from "next/server";
import { OfficeParser } from "officeparser";
import * as XLSX from "xlsx";
import { requireApiAuth } from "@/lib/api-auth";
import { getFileExtension } from "@/lib/document-preview";
import { extractPdfText } from "@/lib/ai/pdf-text";
import { saveAiTempFile } from "@/lib/ai/temp-files";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB
const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // 6MB（base64 后约 8MB）
const MAX_TEXT_CHARS = 30_000;

const IMAGE_MIMES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

// officeparser 支持的文档格式（依赖魔数探测，仅二进制格式）
const DOC_EXTENSIONS = new Set(["pdf", "docx", "pptx", "odt", "odp", "ods", "rtf"]);
const SHEET_EXTENSIONS = new Set(["xlsx", "xls", "csv"]);
const TEXT_EXTENSIONS = new Set(["txt", "md", "log", "json", "xml", "html", "htm", "dat"]);

function truncate(text: string): { text: string; truncated: boolean } {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{4,}/g, "\n\n\n").trim();
  if (cleaned.length <= MAX_TEXT_CHARS) return { text: cleaned, truncated: false };
  return { text: cleaned.slice(0, MAX_TEXT_CHARS), truncated: true };
}

function sheetsToText(buffer: Buffer): string {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  return workbook.SheetNames.map((name) => {
    const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name], { blankrows: false });
    return `【工作表：${name}】\n${csv}`;
  }).join("\n\n");
}

export async function POST(request: Request) {
  const { error } = await requireApiAuth();
  if (error) return error;

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    // fallthrough
  }
  if (!file) {
    return NextResponse.json({ error: "缺少文件" }, { status: 400 });
  }
  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "文件过大，请控制在 15MB 以内" }, { status: 400 });
  }

  const name = file.name || "附件";
  const ext = getFileExtension(name);
  const mime = (file.type || "").toLowerCase();

  // 图片：转 data URL 交给视觉模型
  if (mime.startsWith("image/") || IMAGE_MIMES[ext]) {
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "图片过大，请控制在 6MB 以内" }, { status: 400 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const imageMime = mime.startsWith("image/") ? mime : IMAGE_MIMES[ext];
    if (imageMime === "image/svg+xml") {
      return NextResponse.json({ error: "暂不支持 SVG 图片，请转成 PNG/JPG" }, { status: 400 });
    }
    const fileToken = await saveAiTempFile(buffer, name, imageMime);
    return NextResponse.json({
      kind: "image",
      name,
      fileToken,
      dataUrl: `data:${imageMime};base64,${buffer.toString("base64")}`,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    if (SHEET_EXTENSIONS.has(ext)) {
      const { text, truncated } = truncate(sheetsToText(buffer));
      const fileToken = await saveAiTempFile(buffer, name, mime || "application/octet-stream");
      return NextResponse.json({ kind: "text", name, fileToken, text, truncated });
    }

    if (ext === "doc" || ext === "ppt") {
      return NextResponse.json(
        { error: `暂不支持旧版 .${ext} 格式，请另存为 .${ext}x 或 PDF 后重新上传` },
        { status: 400 },
      );
    }

    if (DOC_EXTENSIONS.has(ext) || mime === "application/pdf") {
      let rawText: string;
      if (ext === "pdf" || mime === "application/pdf") {
        rawText = await extractPdfText(buffer);
      } else {
        const ast = await OfficeParser.parseOffice(buffer, { ocr: false });
        rawText = ast.toText();
      }
      const { text, truncated } = truncate(rawText);
      if (!text) {
        return NextResponse.json(
          { error: "未能从文件中提取到文字内容（可能是扫描件/纯图片 PDF），请尝试截图后粘贴图片" },
          { status: 400 },
        );
      }
      const fileToken = await saveAiTempFile(buffer, name, mime || "application/octet-stream");
      return NextResponse.json({ kind: "text", name, fileToken, text, truncated });
    }

    if (TEXT_EXTENSIONS.has(ext) || mime.startsWith("text/")) {
      const { text, truncated } = truncate(buffer.toString("utf8"));
      const fileToken = await saveAiTempFile(buffer, name, mime || "text/plain");
      return NextResponse.json({ kind: "text", name, fileToken, text, truncated });
    }

    return NextResponse.json(
      { error: `暂不支持 .${ext || "未知"} 格式。支持：PDF、Word(docx)、Excel(xlsx/csv)、PPT(pptx)、文本及图片` },
      { status: 400 },
    );
  } catch (err) {
    console.error("POST /api/ai/extract", err);
    return NextResponse.json(
      { error: `文件解析失败：${err instanceof Error ? err.message : "未知错误"}` },
      { status: 500 },
    );
  }
}

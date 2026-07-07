import { execFile } from "child_process";
import { mkdir, readdir, readFile, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { promisify } from "util";
import type { AiVisionSettings } from "@/lib/ai/config";
import { recognizeImagesWithVision } from "@/lib/ai/vision";

const execFileAsync = promisify(execFile);

const MAX_SCAN_PAGES = 8;
const RENDER_DPI = 120;
const PAGES_PER_VISION_BATCH = 2;

function isPdftoppmMissing(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err.code === "ENOENT" || err.code === 127)
  );
}

function pageNumberFromFilename(filename: string): number {
  const match = filename.match(/-(\d+)\.png$/i);
  return match ? Number.parseInt(match[1], 10) : 0;
}

/** 将 PDF 前几页渲染为 PNG，供视觉模型 OCR */
async function renderPdfPagesToPng(buffer: Buffer): Promise<{ page: number; buffer: Buffer }[]> {
  const dir = path.join(os.tmpdir(), "eda-pdf");
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  const pdfPath = path.join(dir, `${id}.pdf`);
  const outPrefix = path.join(dir, `${id}-page`);
  try {
    await writeFile(pdfPath, buffer);
    await execFileAsync(
      "pdftoppm",
      [
        "-png",
        "-f",
        "1",
        "-l",
        String(MAX_SCAN_PAGES),
        "-r",
        String(RENDER_DPI),
        pdfPath,
        outPrefix,
      ],
      { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 },
    );
    const entries = await readdir(dir);
    const pngFiles = entries
      .filter((name) => name.startsWith(`${id}-page`) && name.endsWith(".png"))
      .sort((a, b) => pageNumberFromFilename(a) - pageNumberFromFilename(b));

    const pages: { page: number; buffer: Buffer }[] = [];
    for (const name of pngFiles) {
      const page = pageNumberFromFilename(name);
      if (!page) continue;
      pages.push({ page, buffer: await readFile(path.join(dir, name)) });
    }
    return pages;
  } finally {
    const entries = await readdir(dir).catch(() => [] as string[]);
    await Promise.all(
      entries
        .filter((name) => name.startsWith(id))
        .map((name) => unlink(path.join(dir, name)).catch(() => {})),
    );
  }
}

/** 扫描件/纯图片 PDF：转页面图片后用视觉模型识别文字 */
export async function extractScannedPdfWithVision(
  buffer: Buffer,
  vision: AiVisionSettings,
): Promise<string> {
  let pages: { page: number; buffer: Buffer }[];
  try {
    pages = await renderPdfPagesToPng(buffer);
  } catch (err) {
    if (isPdftoppmMissing(err)) {
      throw new Error("服务器未安装 pdftoppm，无法识别扫描版 PDF");
    }
    throw err;
  }
  if (!pages.length) return "";

  const parts: string[] = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_VISION_BATCH) {
    const batch = pages.slice(i, i + PAGES_PER_VISION_BATCH);
    const images = batch.map((p) => ({
      name: `第 ${p.page} 页`,
      dataUrl: `data:image/png;base64,${p.buffer.toString("base64")}`,
    }));
    const text = await recognizeImagesWithVision(
      images,
      "这是扫描版 PDF 的页面图片。请完整识别图中的全部文字、数字和表格内容，按阅读顺序用简体中文输出，保留条目与金额结构。",
      vision,
    );
    if (text.trim()) parts.push(text.trim());
  }
  return parts.join("\n\n");
}

export function hasMeaningfulPdfText(text: string): boolean {
  return text.replace(/\s+/g, "").length >= 30;
}

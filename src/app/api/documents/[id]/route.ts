import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { deleteStoredFile, resolveStoragePath } from "@/lib/storage";
import { getFileExtension, isPreviewable } from "@/lib/document-preview";
import { ensurePreviewPdf } from "@/lib/office-pdf";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const preview = searchParams.get("preview") === "1";
  const wantPdf = searchParams.get("pdf") === "1";

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  const absolutePath = resolveStoragePath(document.storagePath);

  if (wantPdf) {
    const pdfPath = await ensurePreviewPdf(
      absolutePath,
      getFileExtension(document.fileName),
    );
    if (!pdfPath) {
      return NextResponse.json({ error: "PDF 转换失败" }, { status: 502 });
    }
    const pdfBuffer = await readFile(pdfPath);
    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  const buffer = await readFile(absolutePath);
  const mimeType = document.mimeType || "application/octet-stream";
  const ext = document.fileName.split(".").pop()?.toLowerCase();
  const canPreview = preview && isPreviewable(mimeType, document.fileName);
  const disposition = canPreview
    ? "inline"
    : `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`;

  const responseMime =
    canPreview && ext === "dat" ? "text/plain; charset=utf-8" : mimeType;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": responseMime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, max-age=3600",
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) {
    return NextResponse.json({ error: "文件不存在" }, { status: 404 });
  }

  await deleteStoredFile(document.storagePath);
  await deleteStoredFile(`${document.storagePath}.preview.pdf`);
  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

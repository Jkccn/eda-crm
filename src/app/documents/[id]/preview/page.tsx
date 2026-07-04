import Link from "next/link";
import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/prisma";
import { resolveStoragePath } from "@/lib/storage";
import {
  documentDownloadUrl,
  documentInlineUrl,
  getFileExtension,
  getPreviewMode,
} from "@/lib/document-preview";
import { renderDocumentPreviewHtml } from "@/lib/document-preview-render";
import { ensurePreviewPdf } from "@/lib/office-pdf";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export default async function DocumentPreviewPage({ params }: Params) {
  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) notFound();

  const mode = getPreviewMode(document.mimeType, document.fileName);
  if (!mode) notFound();

  const absolutePath = resolveStoragePath(document.storagePath);

  // Office 文件优先用本机 Office“打印”为 PDF，完整还原原始排版
  let officePdfReady = false;
  if (mode === "office") {
    officePdfReady =
      (await ensurePreviewPdf(absolutePath, getFileExtension(document.fileName))) != null;
  }

  const buffer =
    mode === "office" && officePdfReady ? null : await readFile(absolutePath);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500">文件预览</p>
          <h1 className="truncate text-lg font-semibold text-slate-100">{document.fileName}</h1>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link href={documentDownloadUrl(document.id)}>
            <Button variant="secondary">下载</Button>
          </Link>
          <Link href={`/opportunities/${document.opportunityId}`}>
            <Button variant="ghost">返回商机</Button>
          </Link>
        </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50">
        {mode === "native" && (
          <NativePreview
            id={document.id}
            fileName={document.fileName}
            mimeType={document.mimeType}
          />
        )}
        {mode === "office" &&
          (officePdfReady ? (
            <iframe
              title={document.fileName}
              src={`/api/documents/${document.id}?pdf=1`}
              className="h-[calc(100vh-12rem)] w-full border-0"
            />
          ) : (
            <OfficePreview
              html={await renderDocumentPreviewHtml(buffer!, document.fileName)}
            />
          ))}
        {mode === "text" && (
          <TextPreview html={await renderDocumentPreviewHtml(buffer!, document.fileName)} />
        )}
      </div>
    </div>
  );
}

function NativePreview({
  id,
  fileName,
  mimeType,
}: {
  id: string;
  fileName: string;
  mimeType: string | null;
}) {
  const url = documentInlineUrl(id);
  const mime = (mimeType || "").toLowerCase();
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (mime.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext || "")) {
    return (
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center overflow-auto bg-slate-950 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={fileName} className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (mime === "application/pdf" || ext === "pdf") {
    return (
      <iframe
        title={fileName}
        src={url}
        className="h-[calc(100vh-12rem)] w-full border-0"
      />
    );
  }

  return (
    <iframe
      title={fileName}
      src={url}
      className="h-[calc(100vh-12rem)] w-full border-0 bg-white"
    />
  );
}

function OfficePreview({ html }: { html: string }) {
  return (
    <div
      className="document-preview-content h-[calc(100vh-12rem)] overflow-auto bg-white p-6 text-slate-900"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function TextPreview({ html }: { html: string }) {
  return (
    <div
      className="document-preview-content h-[calc(100vh-12rem)] overflow-auto bg-slate-50 p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

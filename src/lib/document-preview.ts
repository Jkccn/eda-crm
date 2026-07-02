const NATIVE_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "txt",
  "csv",
]);

const OFFICE_EXTENSIONS = new Set([
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
]);

const OFFICE_MIMES = new Set([
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

export type PreviewMode = "native" | "office" | "text";

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

export function getPreviewMode(
  mimeType: string | null | undefined,
  fileName?: string,
): PreviewMode | null {
  const mime = (mimeType || "").toLowerCase();
  const ext = getFileExtension(fileName || "");

  if (ext === "dat") return "text";
  if (OFFICE_EXTENSIONS.has(ext) || OFFICE_MIMES.has(mime)) return "office";
  if (
    mime.startsWith("image/") ||
    mime === "application/pdf" ||
    mime.startsWith("text/")
  ) {
    return "native";
  }
  if (NATIVE_EXTENSIONS.has(ext)) return "native";
  return null;
}

export function isPreviewable(mimeType: string | null | undefined, fileName?: string): boolean {
  return getPreviewMode(mimeType, fileName) != null;
}

export function documentPreviewUrl(id: string) {
  return `/documents/${id}/preview`;
}

export function documentDownloadUrl(id: string) {
  return `/api/documents/${id}`;
}

export function documentInlineUrl(id: string) {
  return `/api/documents/${id}?preview=1`;
}

export function officeFileType(ext: string): "docx" | "xlsx" | "pptx" | null {
  if (ext === "doc" || ext === "docx") return "docx";
  if (ext === "xls" || ext === "xlsx") return "xlsx";
  if (ext === "ppt" || ext === "pptx") return "pptx";
  return null;
}

export function isLegacyOffice(ext: string): boolean {
  return ext === "doc" || ext === "xls" || ext === "ppt";
}

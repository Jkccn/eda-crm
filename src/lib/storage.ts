import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getUploadRoot, normalizeStoragePath } from "@/lib/paths";

const UPLOAD_ROOT = getUploadRoot();

export function getUploadDir(opportunityId: string) {
  return path.join(UPLOAD_ROOT, opportunityId);
}

export async function saveUploadedFile(
  opportunityId: string,
  file: File,
): Promise<{ storagePath: string; fileSize: number; mimeType: string }> {
  const dir = getUploadDir(opportunityId);
  await mkdir(dir, { recursive: true });

  const safeName = file.name.replace(/[^\w.\-()\u4e00-\u9fff]/g, "_");
  const storagePath = normalizeStoragePath(
    path.posix.join(opportunityId, `${randomUUID()}-${safeName}`),
  );
  const absolutePath = path.join(UPLOAD_ROOT, ...storagePath.split("/"));

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return {
    storagePath,
    fileSize: buffer.length,
    mimeType: file.type || "application/octet-stream",
  };
}

export function resolveStoragePath(storagePath: string) {
  const absolute = path.join(UPLOAD_ROOT, ...normalizeStoragePath(storagePath).split("/"));
  if (!absolute.startsWith(UPLOAD_ROOT)) {
    throw new Error("Invalid path");
  }
  return absolute;
}

export async function deleteStoredFile(storagePath: string) {
  try {
    await unlink(resolveStoragePath(storagePath));
  } catch {
    // file may already be gone
  }
}

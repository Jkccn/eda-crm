import { readdir, stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  getUploadRoot,
  normalizeStoragePath,
  parseStoredFileName,
} from "@/lib/paths";

export type ScannedDiskFile = {
  storagePath: string;
  opportunityId: string;
  storedFileName: string;
  fileName: string;
  fileSize: number;
  opportunityExists: boolean;
  inDatabase: boolean;
};

function guessMimeType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  const map: Record<string, string> = {
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".zip": "application/zip",
    ".dat": "application/octet-stream",
  };
  return map[ext] || "application/octet-stream";
}

export async function scanDiskFiles(): Promise<ScannedDiskFile[]> {
  const uploadRoot = getUploadRoot();
  const [existingDocs, existingOpps] = await Promise.all([
    prisma.document.findMany({ select: { storagePath: true } }),
    prisma.opportunity.findMany({ select: { id: true } }),
  ]);

  const dbPaths = new Set(existingDocs.map((d) => normalizeStoragePath(d.storagePath)));
  const oppIds = new Set(existingOpps.map((o) => o.id));
  const results: ScannedDiskFile[] = [];

  let entries: string[] = [];
  try {
    entries = await readdir(uploadRoot);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (entry === ".gitkeep") continue;
    const oppDir = path.join(uploadRoot, entry);
    const info = await stat(oppDir).catch(() => null);
    if (!info?.isDirectory()) continue;

    const files = await readdir(oppDir).catch(() => [] as string[]);
    for (const storedFileName of files) {
      if (storedFileName.endsWith(".preview.pdf")) continue;
      const absolute = path.join(oppDir, storedFileName);
      const fileInfo = await stat(absolute).catch(() => null);
      if (!fileInfo?.isFile()) continue;

      const storagePath = normalizeStoragePath(path.join(entry, storedFileName));
      results.push({
        storagePath,
        opportunityId: entry,
        storedFileName,
        fileName: parseStoredFileName(storedFileName),
        fileSize: fileInfo.size,
        opportunityExists: oppIds.has(entry),
        inDatabase: dbPaths.has(storagePath),
      });
    }
  }

  return results;
}

/** 为磁盘上已有、数据库缺失且商机仍存在的文件补建记录 */
export async function reindexMissingDocuments() {
  const scanned = await scanDiskFiles();
  const missing = scanned.filter((f) => f.opportunityExists && !f.inDatabase);
  let created = 0;

  for (const file of missing) {
    await prisma.document.create({
      data: {
        opportunityId: file.opportunityId,
        category: "other",
        fileName: file.fileName,
        storagePath: file.storagePath,
        fileSize: file.fileSize,
        mimeType: guessMimeType(file.fileName),
      },
    });
    created += 1;
  }

  const orphaned = scanned.filter((f) => !f.opportunityExists && !f.inDatabase);

  return {
    created,
    scanned: scanned.length,
    orphaned: orphaned.map((f) => ({
      storagePath: f.storagePath,
      opportunityId: f.opportunityId,
      fileName: f.fileName,
      fileSize: f.fileSize,
    })),
  };
}

export { guessMimeType };

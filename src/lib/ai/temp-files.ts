import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { getUploadRoot, normalizeStoragePath } from "@/lib/paths";

// AI 对话附件的原始文件暂存区：上传时保存，AI 调用 attach_document 归档时取走。
const TMP_DIR = path.join(getUploadRoot(), "_ai_tmp");
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type TempFileMeta = {
  fileName: string;
  mimeType: string;
  fileSize: number;
};

function assertToken(token: string) {
  if (!/^[a-f0-9-]{36}$/.test(token)) throw new Error("无效的 fileToken");
}

export async function saveAiTempFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  await mkdir(TMP_DIR, { recursive: true });
  const token = randomUUID();
  const meta: TempFileMeta = { fileName, mimeType, fileSize: buffer.length };
  await writeFile(path.join(TMP_DIR, `${token}.bin`), buffer);
  await writeFile(path.join(TMP_DIR, `${token}.json`), JSON.stringify(meta), "utf8");
  void cleanupAiTempFiles().catch(() => {});
  return token;
}

/** 把暂存文件归档到商机的上传目录，返回 Document 需要的字段；文件不存在返回 null */
export async function consumeAiTempFile(
  token: string,
  opportunityId: string,
): Promise<(TempFileMeta & { storagePath: string }) | null> {
  assertToken(token);
  const binPath = path.join(TMP_DIR, `${token}.bin`);
  const metaPath = path.join(TMP_DIR, `${token}.json`);

  let meta: TempFileMeta;
  try {
    meta = JSON.parse(await readFile(metaPath, "utf8")) as TempFileMeta;
  } catch {
    return null;
  }

  const safeName = meta.fileName.replace(/[^\w.\-()\u4e00-\u9fff]/g, "_");
  const storagePath = normalizeStoragePath(
    path.posix.join(opportunityId, `${randomUUID()}-${safeName}`),
  );
  const targetPath = path.join(getUploadRoot(), ...storagePath.split("/"));
  await mkdir(path.dirname(targetPath), { recursive: true });

  try {
    await copyFile(binPath, targetPath);
  } catch {
    return null;
  }
  // 归档后清理暂存（失败不影响结果）
  void unlink(binPath).catch(() => {});
  void unlink(metaPath).catch(() => {});

  return { ...meta, storagePath };
}

export async function cleanupAiTempFiles() {
  let entries: string[];
  try {
    entries = await readdir(TMP_DIR);
  } catch {
    return;
  }
  const cutoff = Date.now() - MAX_AGE_MS;
  for (const entry of entries) {
    const full = path.join(TMP_DIR, entry);
    try {
      const info = await stat(full);
      if (info.mtimeMs < cutoff) await unlink(full);
    } catch {
      // ignore
    }
  }
}

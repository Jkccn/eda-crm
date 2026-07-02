import { copyFile, mkdir, readdir, stat, writeFile, rm } from "fs/promises";
import path from "path";
import AdmZip from "adm-zip";
import { getDatabasePath, getUploadRoot } from "@/lib/paths";

const MANIFEST = "manifest.json";

export type BackupManifest = {
  version: 1;
  exportedAt: string;
  app: "eda-crm";
};

async function addDirectoryToZip(zip: AdmZip, dirPath: string, zipPrefix: string) {
  const entries = await readdir(dirPath, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.name === ".gitkeep") continue;
    const full = path.join(dirPath, entry.name);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      await addDirectoryToZip(zip, full, zipPath);
    } else {
      zip.addLocalFile(full, zipPrefix);
    }
  }
}

export async function createBackupBuffer(): Promise<Buffer> {
  const zip = new AdmZip();
  const dbPath = getDatabasePath();
  const uploadRoot = getUploadRoot();

  zip.addLocalFile(dbPath, "", "database.db");

  const manifest: BackupManifest = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "eda-crm",
  };
  zip.addFile(MANIFEST, Buffer.from(JSON.stringify(manifest, null, 2), "utf-8"));

  const uploadStat = await stat(uploadRoot).catch(() => null);
  if (uploadStat?.isDirectory()) {
    await addDirectoryToZip(zip, uploadRoot, "uploads");
  }

  return zip.toBuffer();
}

async function copyDirectory(src: string, dest: string) {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirectory(from, to);
    } else if (entry.name !== ".gitkeep") {
      await mkdir(path.dirname(to), { recursive: true });
      await copyFile(from, to);
    }
  }
}

export type RestoreResult = {
  ok: boolean;
  message: string;
  needsRestart?: boolean;
  manifest?: BackupManifest;
};

export async function restoreFromBuffer(buffer: Buffer): Promise<RestoreResult> {
  const zip = new AdmZip(buffer);
  const manifestEntry = zip.getEntry(MANIFEST);
  if (!manifestEntry) {
    return { ok: false, message: "无效的备份包：缺少 manifest.json" };
  }

  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(manifestEntry.getData().toString("utf-8")) as BackupManifest;
  } catch {
    return { ok: false, message: "无效的备份包：manifest 解析失败" };
  }

  if (manifest.app !== "eda-crm") {
    return { ok: false, message: "备份包来源不是 EDA CRM" };
  }

  const dbEntry = zip.getEntry("database.db");
  if (!dbEntry) {
    return { ok: false, message: "无效的备份包：缺少 database.db" };
  }

  const dbPath = getDatabasePath();
  const pendingDbPath = `${dbPath}.pending-restore`;
  const uploadRoot = getUploadRoot();
  const tempDir = path.join(process.cwd(), ".restore-temp");

  await mkdir(tempDir, { recursive: true });
  zip.extractAllTo(tempDir, true);

  try {
    await copyFile(path.join(tempDir, "database.db"), pendingDbPath);

    const extractedUploads = path.join(tempDir, "uploads");
    const uploadStat = await stat(extractedUploads).catch(() => null);
    if (uploadStat?.isDirectory()) {
      await copyDirectory(extractedUploads, uploadRoot);
    }

    try {
      await copyFile(pendingDbPath, dbPath);
    } catch {
      return {
        ok: true,
        needsRestart: true,
        manifest,
        message:
          "uploads 已恢复。数据库文件正被占用，已保存为 dev.db.pending-restore — 请先停止 npm run dev，再将该文件重命名为 dev.db 后重新启动。",
      };
    }

    return {
      ok: true,
      needsRestart: true,
      manifest,
      message: "数据恢复成功。请重启开发服务器（npm run dev）后生效。",
    };
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

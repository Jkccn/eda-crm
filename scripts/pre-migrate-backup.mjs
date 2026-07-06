// 部署/迁移前自动备份 SQLite 数据库。
// 在 `prisma migrate deploy` 之前执行，保证任何一次版本更新前都有可回滚的数据快照。
// 用法: node scripts/pre-migrate-backup.mjs
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "fs";
import path from "path";

const KEEP_BACKUPS = 14;

const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
const filePath = dbUrl.replace(/^file:/, "");
const dbPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

if (!existsSync(dbPath)) {
  console.log(`[backup] 数据库尚不存在（${dbPath}），跳过备份（首次部署）。`);
  process.exit(0);
}

const backupDir = path.join(path.dirname(dbPath), "backups");
mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const target = path.join(backupDir, `db-${stamp}.db`);
copyFileSync(dbPath, target);
// WAL/SHM 附属文件一并备份（如果存在）
for (const suffix of ["-wal", "-shm"]) {
  if (existsSync(dbPath + suffix)) {
    copyFileSync(dbPath + suffix, target + suffix);
  }
}
console.log(`[backup] 已备份数据库 -> ${target}`);

// 只保留最近 N 份，避免磁盘无限增长
const backups = readdirSync(backupDir)
  .filter((f) => /^db-.*\.db$/.test(f))
  .map((f) => ({ name: f, mtime: statSync(path.join(backupDir, f)).mtimeMs }))
  .sort((a, b) => b.mtime - a.mtime);

for (const old of backups.slice(KEEP_BACKUPS)) {
  const base = path.join(backupDir, old.name);
  for (const p of [base, `${base}-wal`, `${base}-shm`]) {
    if (existsSync(p)) unlinkSync(p);
  }
  console.log(`[backup] 清理旧备份 ${old.name}`);
}

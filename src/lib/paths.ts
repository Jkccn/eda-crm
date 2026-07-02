import path from "path";

export function getDatabasePath() {
  const dbUrl = process.env.DATABASE_URL || "file:./prisma/dev.db";
  const filePath = dbUrl.replace(/^file:/, "");
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

export function getUploadRoot() {
  return path.join(process.cwd(), "uploads");
}

export function normalizeStoragePath(storagePath: string) {
  return storagePath.replace(/\\/g, "/");
}

export function parseStoredFileName(storedName: string) {
  const match = storedName.match(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-(.+)$/i,
  );
  return match?.[1] || storedName;
}

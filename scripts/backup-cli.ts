import { writeFile } from "fs/promises";
import path from "path";
import { createBackupBuffer } from "../src/lib/backup";

async function main() {
  const out =
    process.argv[2] ||
    path.join(process.cwd(), `eda-crm-backup-${new Date().toISOString().slice(0, 10)}.zip`);
  const buffer = await createBackupBuffer();
  await writeFile(out, buffer);
  console.log("Backup saved:", out);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

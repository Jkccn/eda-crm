import { execFile } from "child_process";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { promisify } from "util";
import { OfficeParser } from "officeparser";

const execFileAsync = promisify(execFile);

function isPdftotextMissing(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err.code === "ENOENT" || err.code === 127)
  );
}

async function extractWithPdftotext(buffer: Buffer): Promise<string> {
  const dir = path.join(os.tmpdir(), "eda-pdf");
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  const pdfPath = path.join(dir, `${id}.pdf`);
  const txtPath = path.join(dir, `${id}.txt`);
  try {
    await writeFile(pdfPath, buffer);
    await execFileAsync(
      "pdftotext",
      ["-enc", "UTF-8", "-layout", pdfPath, txtPath],
      { timeout: 60_000, maxBuffer: 32 * 1024 * 1024 },
    );
    return await readFile(txtPath, "utf8");
  } finally {
    await Promise.all([unlink(pdfPath).catch(() => {}), unlink(txtPath).catch(() => {})]);
  }
}

/** 优先用 poppler pdftotext；本机无该命令时回退 officeparser（Windows 开发环境） */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    return await extractWithPdftotext(buffer);
  } catch (err) {
    if (!isPdftotextMissing(err)) throw err;
    const ast = await OfficeParser.parseOffice(buffer, { ocr: false });
    return ast.toText();
  }
}

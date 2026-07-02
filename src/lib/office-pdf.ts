import { spawn } from "child_process";
import { access, mkdtemp, rename, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";

const OFFICE_KIND: Record<string, "excel" | "word" | "ppt"> = {
  xls: "excel",
  xlsx: "excel",
  doc: "word",
  docx: "word",
  ppt: "ppt",
  pptx: "ppt",
};

const CONVERT_TIMEOUT_MS = 90_000;

// 同一文件并发请求时复用同一次转换
const inflight = new Map<string, Promise<string | null>>();

export function previewPdfPath(absolutePath: string) {
  return `${absolutePath}.preview.pdf`;
}

/**
 * 将 Office 文档“打印”为 PDF（带缓存）。
 * 转换引擎按优先级自动选择：
 *   1. Microsoft Office COM（仅 Windows 且已安装 Office）
 *   2. LibreOffice headless（soffice，跨平台，适合 Linux/Docker 服务器）
 * 返回 PDF 绝对路径；两种引擎都不可用或转换失败时返回 null。
 */
export async function ensurePreviewPdf(
  absolutePath: string,
  ext: string,
): Promise<string | null> {
  const kind = OFFICE_KIND[ext];
  if (!kind) return null;

  const target = previewPdfPath(absolutePath);

  try {
    const [srcStat, dstStat] = await Promise.all([stat(absolutePath), stat(target)]);
    if (dstStat.size > 0 && dstStat.mtimeMs >= srcStat.mtimeMs) {
      return target;
    }
  } catch {
    // 缓存不存在，继续转换
  }

  const existing = inflight.get(target);
  if (existing) return existing;

  const promise = runConvert(absolutePath, target, kind).finally(() => {
    inflight.delete(target);
  });
  inflight.set(target, promise);
  return promise;
}

async function runConvert(
  source: string,
  target: string,
  kind: "excel" | "word" | "ppt",
): Promise<string | null> {
  if (process.platform === "win32" && (await hasMsOffice())) {
    const result = await runMsOffice(source, target, kind);
    if (result) return result;
  }

  const soffice = await findSoffice();
  if (soffice) {
    return runLibreOffice(soffice, source, target);
  }

  return null;
}

// ---------- 引擎检测 ----------

let msOfficeAvailable: boolean | null = null;

async function hasMsOffice(): Promise<boolean> {
  if (msOfficeAvailable != null) return msOfficeAvailable;
  const candidates = [
    "C:\\Program Files\\Microsoft Office\\Office16",
    "C:\\Program Files (x86)\\Microsoft Office\\Office16",
    "C:\\Program Files\\Microsoft Office\\root\\Office16",
    "C:\\Program Files (x86)\\Microsoft Office\\root\\Office16",
  ];
  for (const dir of candidates) {
    try {
      await access(path.join(dir, "EXCEL.EXE"));
      msOfficeAvailable = true;
      return true;
    } catch {
      // try next
    }
  }
  msOfficeAvailable = false;
  return false;
}

let sofficePath: string | null | undefined;

async function findSoffice(): Promise<string | null> {
  if (sofficePath !== undefined) return sofficePath;

  const candidates = [
    process.env.SOFFICE_PATH,
    // Linux / Docker
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/usr/local/bin/soffice",
    // macOS
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    // Windows
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      sofficePath = candidate;
      return candidate;
    } catch {
      // try next
    }
  }

  // 最后尝试 PATH 中的 soffice
  const onPath = await new Promise<boolean>((resolve) => {
    const child = spawn("soffice", ["--version"], { windowsHide: true, stdio: "ignore" });
    child.on("close", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
  sofficePath = onPath ? "soffice" : null;
  return sofficePath;
}

// ---------- MS Office COM（Windows） ----------

function runMsOffice(
  source: string,
  target: string,
  kind: "excel" | "word" | "ppt",
): Promise<string | null> {
  return new Promise((resolve) => {
    const script = path.join(process.cwd(), "scripts", "office-to-pdf.ps1");
    const child = spawn(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        script,
        "-Source",
        source,
        "-Target",
        target,
        "-Kind",
        kind,
      ],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
    );

    let stderr = "";
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });

    const timer = setTimeout(() => {
      child.kill();
    }, CONVERT_TIMEOUT_MS);

    child.on("close", async (code) => {
      clearTimeout(timer);
      if (code === 0 && (await isNonEmptyFile(target))) {
        return resolve(target);
      }
      if (stderr.trim()) {
        console.error(`office-to-pdf (MS Office, ${kind}) failed:`, stderr.trim().slice(0, 500));
      }
      resolve(null);
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

// ---------- LibreOffice headless（跨平台） ----------

async function runLibreOffice(
  soffice: string,
  source: string,
  target: string,
): Promise<string | null> {
  // 独立的输出目录与 profile 目录，避免并发转换互相干扰
  const outDir = await mkdtemp(path.join(tmpdir(), "lo-pdf-"));
  const profileDir = await mkdtemp(path.join(tmpdir(), "lo-profile-"));
  const profileUrl = `file:///${profileDir.replace(/\\/g, "/")}`;

  try {
    const ok = await new Promise<boolean>((resolve) => {
      const child = spawn(
        soffice,
        [
          "--headless",
          "--norestore",
          "--nolockcheck",
          `-env:UserInstallation=${profileUrl}`,
          "--convert-to",
          "pdf",
          "--outdir",
          outDir,
          source,
        ],
        { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
      );

      let stderr = "";
      child.stderr?.on("data", (chunk) => {
        stderr += String(chunk);
      });

      const timer = setTimeout(() => {
        child.kill();
      }, CONVERT_TIMEOUT_MS);

      child.on("close", (code) => {
        clearTimeout(timer);
        if (code !== 0 && stderr.trim()) {
          console.error("office-to-pdf (LibreOffice) failed:", stderr.trim().slice(0, 500));
        }
        resolve(code === 0);
      });

      child.on("error", () => {
        clearTimeout(timer);
        resolve(false);
      });
    });

    if (!ok) return null;

    const baseName = path.basename(source, path.extname(source));
    const produced = path.join(outDir, `${baseName}.pdf`);
    if (!(await isNonEmptyFile(produced))) return null;

    await rename(produced, target);
    return target;
  } finally {
    await rm(outDir, { recursive: true, force: true }).catch(() => {});
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function isNonEmptyFile(filePath: string): Promise<boolean> {
  try {
    const s = await stat(filePath);
    return s.size > 0;
  } catch {
    return false;
  }
}

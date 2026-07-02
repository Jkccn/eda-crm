import { OfficeConverter } from "officeparser";
import * as XLSX from "xlsx";
import type { CellObject, ColInfo, Range, WorkSheet } from "xlsx";
import {
  getFileExtension,
  isLegacyOffice,
  officeFileType,
} from "@/lib/document-preview";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeTextBuffer(buffer: Buffer): string {
  const utf8 = buffer.toString("utf8");
  if (!utf8.includes("\uFFFD")) return utf8;
  return buffer.toString("latin1");
}

function wrapPreviewHtml(title: string, body: string, className = "office-preview") {
  return `<div class="${className}">${body}</div>`;
}

function renderLegacyNotice(ext: string): string {
  const label =
    ext === "doc" ? "Word (.doc)" : ext === "xls" ? "Excel (.xls)" : "PowerPoint (.ppt)";
  return wrapPreviewHtml(
    label,
    `<p class="preview-notice">旧版 ${label} 格式暂不支持在线预览，请下载后使用 Office 打开，或另存为 Open XML 格式（.${ext}x）后重新上传。</p>`,
  );
}

function getCellDisplayValue(cell: CellObject | undefined): string {
  if (!cell) return "";
  if (cell.w != null) return String(cell.w);
  if (cell.v != null) return String(cell.v);
  return "";
}

type StyledCell = CellObject & {
  s?: { alignment?: { horizontal?: string; vertical?: string; wrapText?: boolean } };
};

function getCellAlign(cell: CellObject | undefined): "left" | "center" | "right" | undefined {
  const horizontal = (cell as StyledCell | undefined)?.s?.alignment?.horizontal;
  if (horizontal === "center" || horizontal === "right" || horizontal === "left") {
    return horizontal;
  }
  // Excel 默认：数字/日期右对齐，文本左对齐
  if (cell?.t === "n" || cell?.t === "d") return "right";
  if (cell?.t === "b") return "center";
  return undefined;
}

function buildColGroup(sheet: WorkSheet, startCol: number, endCol: number): string {
  const cols = sheet["!cols"] as ColInfo[] | undefined;
  if (!cols?.length) return "";

  const parts: string[] = [];
  for (let c = startCol; c <= endCol; c++) {
    const col = cols[c];
    const widthPx =
      col?.wpx ??
      (col?.wch != null ? Math.round(col.wch * 7.5) : undefined) ??
      (col?.width != null ? Math.round(col.width * 7.5) : undefined);

    parts.push(
      widthPx != null
        ? `<col style="width:${widthPx}px; min-width:${widthPx}px" />`
        : "<col style=\"min-width:64px\" />",
    );
  }
  return `<colgroup>${parts.join("")}</colgroup>`;
}

function renderSheetTable(sheet: WorkSheet): string {
  const ref = sheet["!ref"];
  if (!ref) {
    return '<p class="preview-empty-sheet">空工作表</p>';
  }

  const range: Range = XLSX.utils.decode_range(ref);
  const merges = sheet["!merges"] || [];
  const rowInfos = sheet["!rows"] as Array<{ hpx?: number } | undefined> | undefined;
  const mergeStarts = new Map<string, { rowspan: number; colspan: number }>();
  const skipCells = new Set<string>();

  for (const merge of merges) {
    const rowspan = merge.e.r - merge.s.r + 1;
    const colspan = merge.e.c - merge.s.c + 1;
    mergeStarts.set(`${merge.s.r},${merge.s.c}`, { rowspan, colspan });
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        if (r !== merge.s.r || c !== merge.s.c) {
          skipCells.add(`${r},${c}`);
        }
      }
    }
  }

  const rows: string[] = [];
  for (let r = range.s.r; r <= range.e.r; r++) {
    const cells: string[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const key = `${r},${c}`;
      if (skipCells.has(key)) continue;

      const address = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[address] as CellObject | undefined;
      const rawValue = getCellDisplayValue(cell);
      const merge = mergeStarts.get(key);
      let colspan = merge?.colspan ?? 1;
      const rowspan = merge?.rowspan ?? 1;

      // 模拟 Excel 的文字溢出：文本单元格自动占据右侧连续空单元格，
      // 使长文本像在 Excel 中一样横向铺开而不是挤在窄列里换行。
      if (!merge && rawValue && cell?.t === "s") {
        let cc = c + 1;
        while (cc <= range.e.c) {
          const nextKey = `${r},${cc}`;
          if (skipCells.has(nextKey) || mergeStarts.has(nextKey)) break;
          const nextCell = sheet[XLSX.utils.encode_cell({ r, c: cc })] as
            | CellObject
            | undefined;
          if (getCellDisplayValue(nextCell)) break;
          skipCells.add(nextKey);
          colspan++;
          cc++;
        }
      }

      const attrs: string[] = [];
      if (rowspan > 1) attrs.push(`rowspan="${rowspan}"`);
      if (colspan > 1) attrs.push(`colspan="${colspan}"`);

      const align = getCellAlign(cell);
      if (align) attrs.push(`style="text-align:${align}"`);

      cells.push(`<td ${attrs.join(" ")}>${escapeHtml(rawValue)}</td>`);
    }

    const rowHeight = rowInfos?.[r]?.hpx;
    const trAttr = rowHeight ? ` style="height:${Math.round(rowHeight)}px"` : "";
    rows.push(`<tr${trAttr}>${cells.join("")}</tr>`);
  }

  const colgroup = buildColGroup(sheet, range.s.c, range.e.c);
  return `<div class="excel-table-wrap"><table class="excel-table">${colgroup}<tbody>${rows.join("")}</tbody></table></div>`;
}

async function renderExcelHtml(buffer: Buffer): Promise<string> {
  const workbook = XLSX.read(buffer, { type: "buffer", cellStyles: true });
  const sheets = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    const table = renderSheetTable(sheet);
    return `<section class="excel-sheet"><h3>${escapeHtml(name)}</h3>${table}</section>`;
  });
  return wrapPreviewHtml("excel", sheets.join(""), "office-preview excel-preview");
}

async function renderOfficeHtml(buffer: Buffer, fileName: string): Promise<string> {
  const ext = getFileExtension(fileName);
  if (isLegacyOffice(ext)) {
    if (ext === "xls") {
      try {
        return await renderExcelHtml(buffer);
      } catch {
        return renderLegacyNotice(ext);
      }
    }
    return renderLegacyNotice(ext);
  }

  const fileType = officeFileType(ext);
  if (!fileType) {
    throw new Error("不支持的文件类型");
  }

  if (fileType === "xlsx") {
    try {
      return await renderExcelHtml(buffer);
    } catch {
      // fall through to officeparser
    }
  }

  const { value } = await OfficeConverter.convert(buffer, "html", {
    parseConfig: { fileType, ocr: false },
    generatorConfig: { htmlConfig: { containerWidth: "100%" } },
  });

  return wrapPreviewHtml(fileType, String(value || ""), `office-preview ${fileType}-preview`);
}

export function renderDatPreview(buffer: Buffer): string {
  const text = decodeTextBuffer(buffer);
  return `<pre class="dat-preview">${escapeHtml(text)}</pre>`;
}

export async function renderDocumentPreviewHtml(
  buffer: Buffer,
  fileName: string,
): Promise<string> {
  const ext = getFileExtension(fileName);
  if (ext === "dat") return renderDatPreview(buffer);
  return renderOfficeHtml(buffer, fileName);
}

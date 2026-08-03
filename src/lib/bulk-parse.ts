// Reads an uploaded .csv or .xlsx into a header row plus raw cell values.
// Server-only: pulls in exceljs. Meaning is applied later in bulk-import.ts —
// this module only turns a file into a grid.

import ExcelJS from "exceljs";

export const IMPORT_EXTENSIONS = [".csv", ".xlsx"] as const;
export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.join(",");
export const MAX_IMPORT_SIZE_MB = 10;
export const MAX_IMPORT_ROWS = 1000;

export type Sheet = {
  headers: string[];
  // One entry per data row: raw cells, positionally aligned with `headers`.
  rows: unknown[][];
  // 1-based sheet row number of the header, so row numbers in errors match
  // what the user sees in Excel.
  headerRowNumber: number;
};

export function validateImportFile(file: File): string | null {
  if (!file.name) return "Choose a file to upload.";
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!(IMPORT_EXTENSIONS as readonly string[]).includes(ext)) {
    return `File type not supported. Upload a ${IMPORT_EXTENSIONS.join(" or ")} file.`;
  }
  if (file.size === 0) return "The selected file is empty.";
  if (file.size > MAX_IMPORT_SIZE_MB * 1024 * 1024) {
    return `File is too large (max ${MAX_IMPORT_SIZE_MB} MB).`;
  }
  return null;
}

// --- CSV ---------------------------------------------------------------------

// Minimal RFC 4180 reader: double quotes escape the delimiter, newlines and
// quotes themselves. Enough for what Excel and Google Sheets export.
function parseDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  // Whatever is buffered when the text ends is the final field/row.
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// Excel exports semicolon-separated CSV in some locales, and tab-separated
// data gets pasted in too. Pick whichever separator dominates the first line.
function detectDelimiter(text: string): string {
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length);
  const counts = [",", ";", "\t"].map((d) => ({
    delimiter: d,
    count: firstLine.split(d).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].delimiter : ",";
}

function parseCsv(text: string): Sheet {
  // Strip the BOM Excel writes, or it becomes part of the first header.
  const clean = text.replace(/^﻿/, "");
  const grid = parseDelimited(clean, detectDelimiter(clean));

  const headerIndex = grid.findIndex((row) =>
    row.some((cell) => cell.trim() !== "")
  );
  if (headerIndex === -1) return { headers: [], rows: [], headerRowNumber: 1 };

  return {
    headers: grid[headerIndex].map((h) => h.trim()),
    rows: grid.slice(headerIndex + 1),
    headerRowNumber: headerIndex + 1,
  };
}

// --- XLSX --------------------------------------------------------------------

// exceljs hands back rich text, hyperlink and formula objects as well as
// plain values; flatten them to something coerceRow can read.
function cellValue(raw: ExcelJS.CellValue): unknown {
  if (raw === null || raw === undefined) return null;
  if (raw instanceof Date) return raw;
  if (typeof raw === "object") {
    if ("text" in raw && typeof raw.text === "string") return raw.text;
    if ("richText" in raw && Array.isArray(raw.richText)) {
      return raw.richText.map((part) => part.text).join("");
    }
    if ("result" in raw) return cellValue(raw.result as ExcelJS.CellValue);
    if ("error" in raw) return null;
    if ("hyperlink" in raw && typeof raw.hyperlink === "string") {
      return raw.hyperlink;
    }
    return null;
  }
  return raw;
}

async function parseXlsx(buffer: ArrayBuffer): Promise<Sheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [], headerRowNumber: 1 };

  // row.values is 1-based with a hole at index 0.
  const grid: { rowNumber: number; cells: unknown[] }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const values = Array.isArray(row.values) ? row.values.slice(1) : [];
    grid.push({ rowNumber, cells: values.map((v) => cellValue(v as ExcelJS.CellValue)) });
  });

  const headerIndex = grid.findIndex((row) =>
    row.cells.some((cell) => cell !== null && String(cell).trim() !== "")
  );
  if (headerIndex === -1) return { headers: [], rows: [], headerRowNumber: 1 };

  return {
    headers: grid[headerIndex].cells.map((c) =>
      c === null || c === undefined ? "" : String(c).trim()
    ),
    rows: grid.slice(headerIndex + 1).map((r) => r.cells),
    headerRowNumber: grid[headerIndex].rowNumber,
  };
}

export async function parseImportFile(file: File): Promise<Sheet> {
  const buffer = await file.arrayBuffer();
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (ext === ".csv") {
    return parseCsv(new TextDecoder().decode(buffer));
  }
  return parseXlsx(buffer);
}

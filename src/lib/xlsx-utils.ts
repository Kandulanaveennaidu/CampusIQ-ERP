/**
 * Client-side Excel utility using ExcelJS.
 * Drop-in replacement for the xlsx package's browser APIs.
 * Used by dashboard pages for export and template downloads.
 */
import ExcelJS from "exceljs";

export interface SheetColumn {
  wch: number;
}

export interface SheetMerge {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface SheetRow {
  hpt: number;
}

export interface WorksheetWrapper {
  "!cols"?: SheetColumn[];
  "!merges"?: SheetMerge[];
  "!rows"?: SheetRow[];
  _ws: ExcelJS.Worksheet;
  _data?: unknown[][];
}

export interface WorkbookWrapper {
  _wb: ExcelJS.Workbook;
  SheetNames: string[];
  Sheets: Record<string, WorksheetWrapper>;
}

/**
 * Create a new workbook (equivalent to XLSX.utils.book_new())
 */
export function bookNew(): WorkbookWrapper {
  return {
    _wb: new ExcelJS.Workbook(),
    SheetNames: [],
    Sheets: {},
  };
}

/**
 * Create a worksheet from a 2D array (equivalent to XLSX.utils.aoa_to_sheet())
 */
export function aoaToSheet(data: unknown[][]): WorksheetWrapper {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("temp");
  for (const row of data) {
    ws.addRow(row);
  }
  return { _ws: ws, _data: data };
}

/**
 * Create a worksheet from JSON objects (equivalent to XLSX.utils.json_to_sheet())
 */
export function jsonToSheet(data: Record<string, unknown>[]): WorksheetWrapper {
  if (data.length === 0) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("temp");
    return { _ws: ws };
  }

  const headers = Object.keys(data[0]);
  const rows: unknown[][] = [headers];
  for (const obj of data) {
    rows.push(headers.map((h) => obj[h] ?? ""));
  }

  return aoaToSheet(rows);
}

/**
 * Append a sheet to a workbook (equivalent to XLSX.utils.book_append_sheet())
 */
export function bookAppendSheet(
  wb: WorkbookWrapper,
  ws: WorksheetWrapper,
  name: string,
): void {
  wb.SheetNames.push(name);
  wb.Sheets[name] = ws;
}

/**
 * Write workbook to file and trigger download (equivalent to XLSX.writeFile())
 */
export async function writeFile(
  wb: WorkbookWrapper,
  filename: string,
): Promise<void> {
  const workbook = new ExcelJS.Workbook();

  for (const sheetName of wb.SheetNames) {
    const wrapper = wb.Sheets[sheetName];
    const ws = workbook.addWorksheet(sheetName);

    // Copy data from the wrapper's internal worksheet
    if (wrapper._data) {
      for (const row of wrapper._data) {
        ws.addRow(row);
      }
    } else if (wrapper._ws) {
      wrapper._ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        const values: unknown[] = [];
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          while (values.length < colNumber - 1) values.push("");
          values[colNumber - 1] = cell.value;
        });
        ws.getRow(rowNumber).values = values as ExcelJS.CellValue[];
      });
    }

    // Apply column widths
    if (wrapper["!cols"]) {
      wrapper["!cols"].forEach((col, i) => {
        if (ws.columns[i]) {
          ws.getColumn(i + 1).width = col.wch;
        }
      });
    }

    // Apply row heights
    if (wrapper["!rows"]) {
      wrapper["!rows"].forEach((row, i) => {
        if (row.hpt) {
          ws.getRow(i + 1).height = row.hpt * 0.75; // Convert points to Excel units
        }
      });
    }

    // Apply merges
    if (wrapper["!merges"]) {
      for (const merge of wrapper["!merges"]) {
        ws.mergeCells(
          merge.s.r + 1,
          merge.s.c + 1,
          merge.e.r + 1,
          merge.e.c + 1,
        );
      }
    }
  }

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Read an Excel file from binary string (equivalent to XLSX.read())
 * Returns a workbook-like object with SheetNames and Sheets.
 */
export async function read(data: string | ArrayBuffer): Promise<{
  SheetNames: string[];
  Sheets: Record<string, ExcelJS.Worksheet>;
}> {
  const workbook = new ExcelJS.Workbook();

  if (typeof data === "string") {
    // Convert binary string to ArrayBuffer
    const buf = new ArrayBuffer(data.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < data.length; i++) {
      view[i] = data.charCodeAt(i) & 0xff;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(buf as any);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await workbook.xlsx.load(data as any);
  }

  const SheetNames = workbook.worksheets.map((ws) => ws.name);
  const Sheets: Record<string, ExcelJS.Worksheet> = {};
  for (const ws of workbook.worksheets) {
    Sheets[ws.name] = ws;
  }

  return { SheetNames, Sheets };
}

/**
 * Convert an ExcelJS worksheet to JSON (equivalent to XLSX.utils.sheet_to_json())
 */
export function sheetToJson<T = Record<string, unknown>>(
  ws: ExcelJS.Worksheet,
): T[] {
  const rows: T[] = [];
  const headers: string[] = [];

  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) {
      // First row = headers
      row.eachCell({ includeEmpty: true }, (cell) => {
        headers.push(String(cell.value || ""));
      });
    } else {
      const obj: Record<string, unknown> = {};
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          obj[header] = cell.value;
        }
      });
      rows.push(obj as T);
    }
  });

  return rows;
}

/**
 * Convenience object matching the `XLSX` namespace API for minimal migration.
 * Usage: const XLSX = await import("@/lib/xlsx-utils"); then use XLSX.utils.*
 */
const xlsxCompat = {
  utils: {
    book_new: bookNew,
    book_append_sheet: bookAppendSheet,
    aoa_to_sheet: aoaToSheet,
    json_to_sheet: jsonToSheet,
    sheet_to_json: sheetToJson,
  },
  writeFile,
  read,
};

export default xlsxCompat;

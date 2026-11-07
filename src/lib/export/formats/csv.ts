import { cellValue, orderedColumns } from "../prepare";
import { COLUMN_LABELS, type Exporter, type ExportContext } from "../types";

function escapeCell(value: string | number): string {
  let s = typeof value === "number" ? value.toFixed(2) : value;
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of text cells).
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCSV({ rows, options }: Pick<ExportContext, "rows" | "options">): string {
  const cols = orderedColumns(options.columns);
  const header = cols.map((c) => COLUMN_LABELS[c]);
  const body = rows.map((e) => cols.map((c) => escapeCell(cellValue(e, c))).join(","));
  return [header.join(","), ...body].join("\r\n");
}

export const csvExporter: Exporter = {
  id: "csv",
  label: "CSV",
  extension: "csv",
  mimeType: "text/csv;charset=utf-8",
  description: "Spreadsheet-ready. Opens in Excel, Numbers, Google Sheets.",
  // BOM so Excel detects UTF-8 (accents, €, etc.).
  build: async (ctx) => new Blob(["﻿" + buildCSV(ctx)], { type: "text/csv;charset=utf-8" }),
};

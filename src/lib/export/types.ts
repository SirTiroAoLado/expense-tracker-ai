import type { Category, CurrencyCode, Expense } from "../types";

export type ExportFormat = "csv" | "json" | "pdf";

export const EXPORT_COLUMNS = ["date", "category", "amount", "description"] as const;
export type ExportColumn = (typeof EXPORT_COLUMNS)[number];

export const COLUMN_LABELS: Record<ExportColumn, string> = {
  date: "Date",
  category: "Category",
  amount: "Amount",
  description: "Description",
};

export type ExportSort = "date-desc" | "date-asc" | "amount-desc";

/** Everything the user configures in the export dialog. */
export interface ExportOptions {
  format: ExportFormat;
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
  categories: Category[]; // selected; all = no filter
  columns: ExportColumn[];
  sort: ExportSort;
  filename: string; // without extension
}

/** Pre-computed facts about the export, shared by the summary panel and the exporters. */
export interface ExportSummary {
  count: number;
  total: number;
  average: number;
  firstDate: string | null;
  lastDate: string | null;
  byCategory: { category: Category; count: number; total: number }[];
}

export interface ExportContext {
  rows: Expense[];
  options: ExportOptions;
  summary: ExportSummary;
  currency: CurrencyCode;
  generatedAt: Date;
}

/** A format plug-in. Adding a new format = adding one object to the registry. */
export interface Exporter {
  id: ExportFormat;
  label: string;
  extension: string;
  mimeType: string;
  description: string;
  build: (ctx: ExportContext) => Promise<Blob>;
}

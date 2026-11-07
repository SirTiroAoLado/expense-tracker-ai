import { CATEGORIES } from "../../types";
import { cellValue, orderedColumns } from "../prepare";
import type { Exporter, ExportContext } from "../types";

export function buildJSON({ rows, options, summary, currency, generatedAt }: ExportContext): string {
  const cols = orderedColumns(options.columns);
  const allCategories = options.categories.length === CATEGORIES.length;
  return JSON.stringify(
    {
      $schema: "spendwise-export/v1",
      generatedAt: generatedAt.toISOString(),
      currency,
      filters: {
        from: options.from || null,
        to: options.to || null,
        categories: allCategories ? "all" : options.categories,
        sort: options.sort,
      },
      summary: {
        count: summary.count,
        total: summary.total,
        average: summary.average,
        firstDate: summary.firstDate,
        lastDate: summary.lastDate,
        byCategory: summary.byCategory,
      },
      expenses: rows.map((e) => Object.fromEntries(cols.map((c) => [c, cellValue(e, c)]))),
    },
    null,
    2,
  );
}

export const jsonExporter: Exporter = {
  id: "json",
  label: "JSON",
  extension: "json",
  mimeType: "application/json",
  description: "Structured data with filters & summary metadata. Ideal for developers.",
  build: async (ctx) => new Blob([buildJSON(ctx)], { type: "application/json" }),
};

import { roundMoney } from "../format";
import { CATEGORIES, type Expense } from "../types";
import { COLUMN_LABELS, type ExportColumn, type ExportOptions, type ExportSummary } from "./types";

/** Apply the dialog's date range, category selection and sort order. */
export function selectRows(expenses: Expense[], o: Pick<ExportOptions, "from" | "to" | "categories" | "sort">): Expense[] {
  const cats = new Set(o.categories);
  const rows = expenses.filter(
    (e) => cats.has(e.category) && (!o.from || e.date >= o.from) && (!o.to || e.date <= o.to),
  );
  const byDate = (a: Expense, b: Expense) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
  switch (o.sort) {
    case "date-asc":
      return rows.sort(byDate);
    case "date-desc":
      return rows.sort((a, b) => byDate(b, a));
    case "amount-desc":
      return rows.sort((a, b) => b.amount - a.amount);
  }
}

export function summarize(rows: Expense[]): ExportSummary {
  let total = 0;
  let first: string | null = null;
  let last: string | null = null;
  const map = new Map(CATEGORIES.map((c) => [c, { count: 0, total: 0 }]));
  for (const e of rows) {
    total += e.amount;
    if (!first || e.date < first) first = e.date;
    if (!last || e.date > last) last = e.date;
    const m = map.get(e.category)!;
    m.count++;
    m.total += e.amount;
  }
  return {
    count: rows.length,
    total: roundMoney(total),
    average: rows.length ? roundMoney(total / rows.length) : 0,
    firstDate: first,
    lastDate: last,
    byCategory: CATEGORIES.map((category) => ({ category, ...map.get(category)!, total: roundMoney(map.get(category)!.total) }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.total - a.total),
  };
}

/** Columns always come out in canonical order regardless of toggle order. */
export function orderedColumns(cols: ExportColumn[]): ExportColumn[] {
  return (Object.keys(COLUMN_LABELS) as ExportColumn[]).filter((c) => cols.includes(c));
}

export function cellValue(e: Expense, col: ExportColumn): string | number {
  switch (col) {
    case "date":
      return e.date;
    case "category":
      return e.category;
    case "amount":
      return e.amount;
    case "description":
      return e.description;
  }
}

const INVALID_FILENAME = /[<>:"/\\|?*\u0000-\u001f]/g;

/** Make a user-typed name safe on Windows/macOS/Linux. Returns "" if nothing usable is left. */
export function sanitizeFilename(name: string): string {
  return name
    .replace(INVALID_FILENAME, "-")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+|[.\s-]+$/g, "")
    .slice(0, 120);
}

export function defaultFilename(o: Pick<ExportOptions, "from" | "to" | "categories">, allCategoryCount: number): string {
  const parts = ["spendwise-expenses"];
  if (o.categories.length > 0 && o.categories.length < allCategoryCount && o.categories.length <= 2) {
    parts.push(o.categories.map((c) => c.toLowerCase()).join("-"));
  }
  if (o.from || o.to) parts.push(`${o.from || "start"}_to_${o.to || "today"}`);
  else parts.push("all-time");
  return parts.join("-");
}

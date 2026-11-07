import type { Expense } from "./types";

function escapeCell(value: string | number): string {
  let s = String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s) && typeof value === "string") s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function expensesToCSV(expenses: Expense[]): string {
  const header = ["Date", "Category", "Amount", "Description"];
  const rows = expenses.map((e) => [e.date, e.category, e.amount.toFixed(2), e.description]);
  return [header, ...rows].map((r) => r.map(escapeCell).join(",")).join("\r\n");
}

export function downloadCSV(expenses: Expense[], filename: string): void {
  // BOM so Excel opens UTF-8 (accents, € etc.) correctly.
  const blob = new Blob(["﻿" + expensesToCSV(expenses)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

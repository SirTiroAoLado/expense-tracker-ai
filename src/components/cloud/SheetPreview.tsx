"use client";

import { Sheet } from "lucide-react";

const colLetter = (i: number) => String.fromCharCode(65 + i);

/** Spreadsheet-styled preview (column letters, row numbers, tab bar). */
export function SheetPreview({ table, title, tabs, maxRows = 12 }: { table: string[][]; title: string; tabs: string[]; maxRows?: number }) {
  const cols = table[0]?.length ?? 0;
  const numeric = (s: string) => /^-?\d+(\.\d+)?$/.test(s);
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <Sheet className="h-4 w-4 text-green-600" aria-hidden />
        <span className="truncate text-sm font-medium text-slate-800">{title}</span>
      </div>
      <div className="max-h-64 overflow-auto">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead>
            <tr>
              <th className="sticky top-0 w-8 border border-slate-200 bg-slate-100" />
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="sticky top-0 min-w-[72px] border border-slate-200 bg-slate-100 px-2 py-0.5 font-medium text-slate-500">
                  {colLetter(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.slice(0, maxRows).map((row, r) => (
              <tr key={r}>
                <td className="border border-slate-200 bg-slate-50 px-1.5 text-center text-slate-400">{r + 1}</td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={`max-w-[160px] truncate border border-slate-200 px-2 py-1 ${
                      r === 0 ? "bg-green-50 font-semibold text-slate-800" : numeric(cell) ? "text-right text-slate-700" : "text-slate-700"
                    } ${/total|subtotal/i.test(row[0]) ? "font-semibold" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-1 border-t border-slate-200 bg-slate-50 px-2 py-1">
        {tabs.map((t, i) => (
          <span
            key={t}
            className={`rounded-t px-3 py-1 text-[11px] font-medium ${i === 0 ? "bg-white text-green-700 shadow-sm" : "text-slate-500"}`}
          >
            {t}
          </span>
        ))}
        {table.length > maxRows && <span className="ml-auto text-[11px] text-slate-400">+{table.length - maxRows} more rows</span>}
      </div>
    </div>
  );
}

"use client";

import { SearchX } from "lucide-react";
import { CATEGORY_META } from "@/lib/categories";
import { COLUMN_LABELS, orderedColumns, type ExportColumn, type ExportSummary } from "@/lib/export";
import { formatCurrency, formatDate } from "@/lib/format";
import type { CurrencyCode, Expense } from "@/lib/types";

const PREVIEW_LIMIT = 100;

export function ExportSummaryStrip({ summary, currency }: { summary: ExportSummary; currency: CurrencyCode }) {
  const span =
    summary.firstDate && summary.lastDate
      ? summary.firstDate === summary.lastDate
        ? formatDate(summary.firstDate)
        : `${formatDate(summary.firstDate)} – ${formatDate(summary.lastDate)}`
      : "—";
  return (
    <div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-slate-200 ring-1 ring-slate-200 sm:grid-cols-4">
        {[
          ["Records", summary.count.toLocaleString()],
          ["Total", formatCurrency(summary.total, currency)],
          ["Average", formatCurrency(summary.average, currency)],
          ["Date span", span],
        ].map(([label, value]) => (
          <div key={label} className="bg-white px-4 py-3">
            <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-0.5 truncate text-sm font-semibold tabular-nums text-slate-900" title={value}>
              {value}
            </dd>
          </div>
        ))}
      </dl>

      {summary.byCategory.length > 0 && (
        <div className="mt-3">
          <div className="flex h-2 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
            {summary.byCategory.map((c) => (
              <div
                key={c.category}
                style={{ width: `${(c.total / summary.total) * 100}%`, backgroundColor: CATEGORY_META[c.category].color }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
            {summary.byCategory.map((c) => (
              <li key={c.category} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_META[c.category].color }} aria-hidden />
                {c.category}
                <span className="tabular-nums text-slate-400">{((c.total / summary.total) * 100).toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ExportPreviewTable({
  rows,
  columns,
  currency,
}: {
  rows: Expense[];
  columns: ExportColumn[];
  currency: CurrencyCode;
}) {
  const cols = orderedColumns(columns);

  if (rows.length === 0) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-center">
        <SearchX className="mb-3 h-8 w-8 text-slate-300" aria-hidden />
        <p className="text-sm font-medium text-slate-700">No expenses match these options</p>
        <p className="mt-1 text-sm text-slate-500">Widen the date range or select more categories.</p>
      </div>
    );
  }
  if (cols.length === 0) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-slate-300 p-8 text-sm text-slate-500">
        Select at least one column to preview.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-auto rounded-xl ring-1 ring-slate-200">
        <table className="w-full min-w-[480px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 w-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-right text-[11px] font-semibold text-slate-400">
                #
              </th>
              {cols.map((c) => (
                <th
                  key={c}
                  scope="col"
                  className={`sticky top-0 z-10 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${
                    c === "amount" ? "text-right" : ""
                  }`}
                >
                  {COLUMN_LABELS[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, PREVIEW_LIMIT).map((e, i) => (
              <tr key={e.id} className="even:bg-slate-50/60">
                <td className="border-b border-slate-100 px-3 py-2 text-right text-xs tabular-nums text-slate-400">{i + 1}</td>
                {cols.map((c) => (
                  <td
                    key={c}
                    className={`border-b border-slate-100 px-3 py-2 ${
                      c === "amount" ? "text-right font-medium tabular-nums text-slate-900" : "text-slate-700"
                    } ${c === "description" ? "max-w-[240px] truncate" : "whitespace-nowrap"}`}
                  >
                    {c === "amount" ? (
                      formatCurrency(e.amount, currency)
                    ) : c === "date" ? (
                      formatDate(e.date)
                    ) : c === "category" ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_META[e.category].color }} aria-hidden />
                        {e.category}
                      </span>
                    ) : (
                      e.description
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > PREVIEW_LIMIT && (
        <p className="mt-2 text-xs text-slate-500">
          Previewing the first {PREVIEW_LIMIT} of {rows.length.toLocaleString()} rows — all rows will be exported.
        </p>
      )}
    </div>
  );
}

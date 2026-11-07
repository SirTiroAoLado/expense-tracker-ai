"use client";

import { useMemo, useState } from "react";
import { monthlyTotals } from "@/lib/analytics";
import { formatCurrency, formatMonthKey } from "@/lib/format";
import type { CurrencyCode, Expense } from "@/lib/types";

const RANGES = [6, 12] as const;

/** Single-series column chart of spending per month. Hand-built (no chart lib) for a tiny bundle. */
export function MonthlyTrendChart({ expenses, currency }: { expenses: Expense[]; currency: CurrencyCode }) {
  const [months, setMonths] = useState<(typeof RANGES)[number]>(6);
  const [hover, setHover] = useState<number | null>(null);
  const data = useMemo(() => monthlyTotals(expenses, months), [expenses, months]);

  const max = Math.max(...data.map((d) => d.total), 0);
  const niceMax = niceCeil(max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * niceMax);
  const avg = data.reduce((a, d) => a + d.total, 0) / data.length;

  return (
    <section className="card p-5" aria-labelledby="trend-title">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trend-title" className="text-base font-semibold text-slate-900">
            Monthly spending
          </h2>
          <p className="text-sm text-slate-500">
            Average {formatCurrency(avg, currency)} / month over the last {months} months
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-sm" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setMonths(r)}
              aria-pressed={months === r}
              className={`rounded-md px-3 py-1 font-medium transition ${
                months === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {r}M
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex h-56 gap-2">
        {/* Y axis labels */}
        <div className="flex w-12 shrink-0 flex-col-reverse justify-between pb-6 text-right text-[11px] tabular-nums text-slate-400">
          {ticks.map((t) => (
            <span key={t} className="leading-none">
              {niceMax === 0 ? "" : formatCurrency(t, currency, true)}
            </span>
          ))}
        </div>

        <div className="relative flex-1">
          {/* gridlines */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 top-0 flex flex-col-reverse justify-between" aria-hidden>
            {ticks.map((t, i) => (
              <div key={t} className={i === 0 ? "border-t border-slate-300" : "border-t border-slate-100"} />
            ))}
          </div>

          <div className="absolute inset-0 flex items-stretch" role="list" aria-label="Spending by month">
            {data.map((d, i) => {
              const h = niceMax > 0 ? (d.total / niceMax) * 100 : 0;
              const active = hover === i;
              return (
                <div
                  key={d.key}
                  role="listitem"
                  tabIndex={0}
                  aria-label={`${formatMonthKey(d.key, "long")}: ${formatCurrency(d.total, currency)}`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover(null)}
                  className="group relative flex flex-1 flex-col items-center outline-none"
                >
                  <div className="relative flex w-full flex-1 items-end justify-center px-[2px]">
                    <div
                      className={`w-full max-w-[36px] rounded-t transition-[height,opacity] duration-500 ${
                        hover === null || active ? "opacity-100" : "opacity-60"
                      }`}
                      style={{ height: `${h}%`, backgroundColor: "#2a78d6", minHeight: d.total > 0 ? 2 : 0 }}
                    />
                    {active && (
                      <div className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-y-0 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                        style={{ bottom: `${h}%` }}
                      >
                        <p className="text-slate-300">{formatMonthKey(d.key, "long")}</p>
                        <p className="font-semibold tabular-nums">{formatCurrency(d.total, currency)}</p>
                      </div>
                    )}
                  </div>
                  <span
                    className={`flex h-6 items-end text-[11px] ${active ? "font-medium text-slate-700" : "text-slate-400"} ${
                      months === 12 && i % 2 === 1 ? "max-sm:invisible" : ""
                    }`}
                  >
                    {formatMonthKey(d.key)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function niceCeil(n: number): number {
  if (n <= 0) return 0;
  const exp = Math.pow(10, Math.floor(Math.log10(n)));
  const f = n / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

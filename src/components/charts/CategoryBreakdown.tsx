"use client";

import { useMemo, useState } from "react";
import { sum, totalsByCategory } from "@/lib/analytics";
import { CATEGORY_META } from "@/lib/categories";
import { formatCurrency } from "@/lib/format";
import type { CurrencyCode, Expense } from "@/lib/types";
import { CategoryIcon } from "../CategoryBadge";

/**
 * Category breakdown: a 100% stacked bar for share-of-whole plus a ranked,
 * direct-labelled bar list (so identity never relies on color alone).
 */
export function CategoryBreakdown({
  expenses,
  currency,
  title = "Spending by category",
  subtitle,
}: {
  expenses: Expense[];
  currency: CurrencyCode;
  title?: string;
  subtitle?: string;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      totalsByCategory(expenses)
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total),
    [expenses],
  );
  const total = sum(expenses);
  const max = rows[0]?.total ?? 0;

  return (
    <section className="card p-5" aria-labelledby="cat-title">
      <div className="mb-4">
        <h2 id="cat-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <p className="text-sm text-slate-500">{subtitle ?? `${formatCurrency(total, currency)} across ${rows.length} categories`}</p>
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">No spending in this period.</p>
      ) : (
        <>
          {/* share-of-whole strip, 2px surface gaps between segments */}
          <div className="mb-5 flex h-3 w-full gap-[2px] overflow-hidden rounded-full" aria-hidden>
            {rows.map((r) => (
              <div
                key={r.category}
                onMouseEnter={() => setHover(r.category)}
                onMouseLeave={() => setHover(null)}
                className="h-full transition-opacity"
                title={`${r.category}: ${((r.total / total) * 100).toFixed(1)}%`}
                style={{
                  width: `${(r.total / total) * 100}%`,
                  backgroundColor: CATEGORY_META[r.category].color,
                  opacity: hover && hover !== r.category ? 0.35 : 1,
                }}
              />
            ))}
          </div>

          <ul className="space-y-3.5">
            {rows.map((r) => {
              const pct = (r.total / total) * 100;
              return (
                <li
                  key={r.category}
                  onMouseEnter={() => setHover(r.category)}
                  onMouseLeave={() => setHover(null)}
                  className={`flex items-center gap-3 transition-opacity ${hover && hover !== r.category ? "opacity-50" : ""}`}
                >
                  <CategoryIcon category={r.category} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-medium text-slate-800">
                        {r.category}
                        <span className="ml-1.5 font-normal text-slate-400">
                          {r.count} item{r.count === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-900">
                        {formatCurrency(r.total, currency)}
                        <span className="ml-1.5 inline-block w-10 text-right text-slate-500">{pct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${(r.total / max) * 100}%`, backgroundColor: CATEGORY_META[r.category].color }}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}

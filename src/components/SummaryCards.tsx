"use client";

import { ArrowDownRight, ArrowUpRight, CalendarDays, Crown, Hash, Wallet } from "lucide-react";
import { useMemo, type ReactNode } from "react";
import { currentMonthKey, previousMonthKey, sum, totalsByCategory } from "@/lib/analytics";
import { formatCurrency, monthKey } from "@/lib/format";
import type { CurrencyCode, Expense } from "@/lib/types";
import { CategoryIcon } from "./CategoryBadge";

export function SummaryCards({ expenses, currency }: { expenses: Expense[]; currency: CurrencyCode }) {
  const stats = useMemo(() => {
    const now = new Date();
    const cur = currentMonthKey(now);
    const prev = previousMonthKey(now);
    const thisMonth = expenses.filter((e) => monthKey(e.date) === cur);
    const lastMonth = expenses.filter((e) => monthKey(e.date) === prev);
    const thisTotal = sum(thisMonth);
    const lastTotal = sum(lastMonth);
    const change = lastTotal > 0 ? ((thisTotal - lastTotal) / lastTotal) * 100 : null;
    const top = totalsByCategory(thisMonth.length ? thisMonth : expenses)
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)[0];
    const topBase = thisMonth.length ? thisTotal : sum(expenses);
    return {
      total: sum(expenses),
      count: expenses.length,
      thisTotal,
      thisCount: thisMonth.length,
      change,
      dailyAvg: thisTotal / now.getDate(),
      top,
      topShare: top && topBase > 0 ? (top.total / topBase) * 100 : 0,
      topScope: thisMonth.length ? "this month" : "all time",
    };
  }, [expenses]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card label="Total spending" icon={<Wallet className="h-4 w-4" />}>
        <Value>{formatCurrency(stats.total, currency)}</Value>
        <Sub>
          {stats.count} expense{stats.count === 1 ? "" : "s"} recorded
        </Sub>
      </Card>

      <Card label="This month" icon={<CalendarDays className="h-4 w-4" />}>
        <Value>{formatCurrency(stats.thisTotal, currency)}</Value>
        {stats.change === null ? (
          <Sub>No spending last month to compare</Sub>
        ) : (
          <p className="mt-1 flex items-center gap-1 text-sm">
            {/* Spending going UP is bad, DOWN is good. Icon + text, never color alone. */}
            <span
              className={`inline-flex items-center gap-0.5 font-medium ${
                stats.change > 0 ? "text-red-600" : "text-emerald-700"
              }`}
            >
              {stats.change > 0 ? <ArrowUpRight className="h-4 w-4" aria-hidden /> : <ArrowDownRight className="h-4 w-4" aria-hidden />}
              {Math.abs(stats.change).toFixed(0)}% {stats.change > 0 ? "more" : "less"}
            </span>
            <span className="text-slate-500">than last month</span>
          </p>
        )}
      </Card>

      <Card label="Daily average" icon={<Hash className="h-4 w-4" />}>
        <Value>{formatCurrency(stats.dailyAvg, currency)}</Value>
        <Sub>
          {stats.thisCount} expense{stats.thisCount === 1 ? "" : "s"} so far this month
        </Sub>
      </Card>

      <Card label="Top category" icon={<Crown className="h-4 w-4" />}>
        {stats.top ? (
          <>
            <div className="flex items-center gap-2.5">
              <CategoryIcon category={stats.top.category} size="sm" />
              <Value>{stats.top.category}</Value>
            </div>
            <Sub>
              {formatCurrency(stats.top.total, currency)} · {stats.topShare.toFixed(0)}% of {stats.topScope}
            </Sub>
          </>
        ) : (
          <>
            <Value>—</Value>
            <Sub>No expenses yet</Sub>
          </>
        )}
      </Card>
    </div>
  );
}

function Card({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500" aria-hidden>
          {icon}
        </span>
      </div>
      {children}
    </div>
  );
}

const Value = ({ children }: { children: ReactNode }) => (
  <p className="truncate text-2xl font-semibold tracking-tight text-slate-900">{children}</p>
);
const Sub = ({ children }: { children: ReactNode }) => <p className="mt-1 text-sm text-slate-500">{children}</p>;

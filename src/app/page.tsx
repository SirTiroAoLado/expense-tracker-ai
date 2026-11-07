"use client";

import { ArrowRight, Download, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CategoryBreakdown } from "@/components/charts/CategoryBreakdown";
import { MonthlyTrendChart } from "@/components/charts/MonthlyTrendChart";
import { ExpenseList } from "@/components/ExpenseList";
import { EmptyState, PageSkeleton } from "@/components/States";
import { SummaryCards } from "@/components/SummaryCards";
import { useExpenseDialog } from "@/hooks/useExpenseDialog";
import { useExpenses } from "@/hooks/useExpenses";
import { currentMonthKey, sortExpenses } from "@/lib/analytics";
import { downloadCSV } from "@/lib/csv";
import { formatMonthKey, monthKey, todayISO } from "@/lib/format";

export default function DashboardPage() {
  const { expenses, isLoading, currency } = useExpenses();
  const { openCreate } = useExpenseDialog();

  const recent = useMemo(() => sortExpenses(expenses, "date-desc").slice(0, 6), [expenses]);
  const cur = currentMonthKey();
  const thisMonth = useMemo(() => expenses.filter((e) => monthKey(e.date) === cur), [expenses, cur]);

  if (isLoading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">An overview of where your money goes.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => downloadCSV(sortExpenses(expenses, "date-desc"), `expenses-${todayISO()}.csv`)}
            disabled={expenses.length === 0}
            className="btn-secondary"
          >
            <Download className="h-4 w-4" aria-hidden />
            Export Data
          </button>
          <button onClick={openCreate} className="btn-primary sm:hidden">
            <Plus className="h-4 w-4" aria-hidden />
            Add expense
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="card">
          <EmptyState
            title="Start tracking your spending"
            description="Add your first expense to see summaries and charts here — or load sample data to explore the app."
            showSample
          />
        </div>
      ) : (
        <>
          <SummaryCards expenses={expenses} currency={currency} />

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <MonthlyTrendChart expenses={expenses} currency={currency} />
            </div>
            <div className="lg:col-span-2">
              <CategoryBreakdown
                expenses={thisMonth.length ? thisMonth : expenses}
                currency={currency}
                title={thisMonth.length ? `Categories · ${formatMonthKey(cur, "long")}` : "Categories · all time"}
              />
            </div>
          </div>

          <section className="card overflow-hidden" aria-labelledby="recent-title">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 id="recent-title" className="text-base font-semibold text-slate-900">
                Recent expenses
              </h2>
              <Link
                href="/expenses"
                className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View all <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <ExpenseList expenses={recent} compact />
          </section>
        </>
      )}
    </div>
  );
}

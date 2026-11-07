"use client";

import { FileDown, Plus, Trash2 } from "lucide-react";
import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ExpenseList } from "@/components/ExpenseList";
import { DEFAULT_FILTERS, FilterBar } from "@/components/FilterBar";
import { Modal } from "@/components/Modal";
import { EmptyState, Skeleton } from "@/components/States";
import { useExpenseDialog } from "@/hooks/useExpenseDialog";
import { useExpenses } from "@/hooks/useExpenses";
import { useExportDrawer } from "@/hooks/useExportDrawer";
import { useToast } from "@/hooks/useToast";
import { filterExpenses, sortExpenses, sum } from "@/lib/analytics";
import { formatCurrency } from "@/lib/format";
import { CATEGORIES, type ExpenseFilters, type SortKey } from "@/lib/types";

const PAGE_SIZE = 50;

export default function ExpensesPage() {
  const { expenses, isLoading, currency, clearAll } = useExpenses();
  const { openCreate } = useExpenseDialog();
  const { toast } = useToast();
  const { openExport } = useExportDrawer();

  const [filters, setFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortKey>("date-desc");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [confirmClear, setConfirmClear] = useState(false);
  const deferredFilters = useDeferredValue(filters);

  const filtered = useMemo(
    () => sortExpenses(filterExpenses(expenses, deferredFilters), sort),
    [expenses, deferredFilters, sort],
  );
  const total = sum(filtered);

  useEffect(() => setVisible(PAGE_SIZE), [filters, sort]);

  // Carry the page's date range and category filter into the export drawer.
  const handleExport = () =>
    openExport({
      from: filters.from,
      to: filters.to,
      categories: filters.category === "All" ? [...CATEGORIES] : [filters.category],
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Expenses</h1>
          <p className="mt-1 text-sm text-slate-500">Search, filter, edit and export your expenses.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExport} className="btn-secondary" disabled={isLoading || expenses.length === 0}>
            <FileDown className="h-4 w-4" aria-hidden />
            Export…
          </button>
          <button onClick={openCreate} className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden />
            Add expense
          </button>
        </div>
      </div>

      <FilterBar filters={filters} onChange={setFilters} sort={sort} onSortChange={setSort} />

      <section className="card overflow-hidden" aria-labelledby="list-title">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
          <h2 id="list-title" className="text-sm text-slate-500">
            {isLoading ? (
              "Loading…"
            ) : (
              <>
                <span className="font-semibold text-slate-900">{filtered.length}</span> of {expenses.length} expenses
              </>
            )}
          </h2>
          <p className="text-sm text-slate-500">
            Total <span className="font-semibold tabular-nums text-slate-900">{formatCurrency(total, currency)}</span>
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState title="No expenses yet" description="Expenses you add will show up here." showSample />
        ) : filtered.length === 0 ? (
          <EmptyState title="No matching expenses" description="Try a different search term, category or date range.">
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="btn-secondary">
              Clear filters
            </button>
          </EmptyState>
        ) : (
          <>
            <ExpenseList expenses={filtered.slice(0, visible)} />
            {filtered.length > visible && (
              <div className="border-t border-slate-100 p-3 text-center">
                <button
                  onClick={() => setVisible((v) => v + PAGE_SIZE)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50"
                >
                  Show more ({filtered.length - visible} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {expenses.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => setConfirmClear(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            Delete all expenses
          </button>
        </div>
      )}

      {confirmClear && (
        <Modal title="Delete all expenses?" size="sm" onClose={() => setConfirmClear(false)}>
          <p className="text-sm text-slate-600">
            This permanently removes all {expenses.length} expenses from this browser. Consider exporting a CSV first.
            This can&apos;t be undone.
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button data-autofocus onClick={() => setConfirmClear(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                clearAll();
                setConfirmClear(false);
                toast("All expenses deleted", { kind: "info" });
              }}
              className="btn-danger"
            >
              Delete everything
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

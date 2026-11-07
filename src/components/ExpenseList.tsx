"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useExpenseDialog } from "@/hooks/useExpenseDialog";
import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { CategoryBadge, CategoryIcon } from "./CategoryBadge";

export function ExpenseList({ expenses, compact = false }: { expenses: Expense[]; compact?: boolean }) {
  const { currency, deleteExpense, restoreExpense } = useExpenses();
  const { openEdit } = useExpenseDialog();
  const { toast } = useToast();

  const handleDelete = (e: Expense) => {
    const removed = deleteExpense(e.id);
    if (removed) {
      toast(`Deleted “${removed.description}”`, {
        kind: "info",
        action: { label: "Undo", onClick: () => restoreExpense(removed) },
      });
    }
  };

  return (
    <ul className="divide-y divide-slate-100">
      {expenses.map((e) => (
        <li key={e.id} className="group flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50/70 sm:gap-4 sm:px-5">
          <CategoryIcon category={e.category} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{e.description}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <time dateTime={e.date}>{formatDate(e.date)}</time>
              {!compact && (
                <>
                  <span aria-hidden>·</span>
                  <CategoryBadge category={e.category} />
                </>
              )}
              {compact && (
                <>
                  <span aria-hidden>·</span>
                  <span>{e.category}</span>
                </>
              )}
            </div>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
            −{formatCurrency(e.amount, currency)}
          </p>
          {!compact && (
            <div className="flex shrink-0 items-center gap-0.5 sm:opacity-0 sm:transition sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
              <button
                onClick={() => openEdit(e)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label={`Edit ${e.description}`}
                title="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleDelete(e)}
                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${e.description}`}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

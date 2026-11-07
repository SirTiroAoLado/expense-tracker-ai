"use client";

import { AlertTriangle, Plus, Sparkles, X } from "lucide-react";
import type { ReactNode } from "react";
import { useExpenseDialog } from "@/hooks/useExpenseDialog";
import { useExpenses } from "@/hooks/useExpenses";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Skeleton className="h-72 lg:col-span-3" />
        <Skeleton className="h-72 lg:col-span-2" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  showSample = false,
  children,
}: {
  title: string;
  description: string;
  showSample?: boolean;
  children?: ReactNode;
}) {
  const { openCreate } = useExpenseDialog();
  const { loadSampleData } = useExpenses();
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Sparkles className="h-6 w-6" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {children ?? (
          <>
            <button onClick={openCreate} className="btn-primary">
              <Plus className="h-4 w-4" aria-hidden />
              Add your first expense
            </button>
            {showSample && (
              <button onClick={loadSampleData} className="btn-secondary">
                Load sample data
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ErrorBanner() {
  const { error, dismissError } = useExpenses();
  if (!error) return null;
  return (
    <div role="alert" className="mb-6 flex items-start gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-inset ring-red-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p className="flex-1">{error}</p>
      <button onClick={dismissError} className="rounded p-0.5 hover:bg-red-100" aria-label="Dismiss error">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

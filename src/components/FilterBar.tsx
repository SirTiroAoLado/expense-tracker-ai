"use client";

import { Search, X } from "lucide-react";
import { toISODate, todayISO } from "@/lib/format";
import { CATEGORIES, type ExpenseFilters, type SortKey } from "@/lib/types";

export const DEFAULT_FILTERS: ExpenseFilters = { search: "", category: "All", from: "", to: "" };

const PRESETS: { label: string; range: () => [string, string] }[] = [
  {
    label: "This month",
    range: () => {
      const n = new Date();
      return [toISODate(new Date(n.getFullYear(), n.getMonth(), 1)), todayISO()];
    },
  },
  {
    label: "Last month",
    range: () => {
      const n = new Date();
      return [toISODate(new Date(n.getFullYear(), n.getMonth() - 1, 1)), toISODate(new Date(n.getFullYear(), n.getMonth(), 0))];
    },
  },
  {
    label: "Last 30 days",
    range: () => {
      const n = new Date();
      return [toISODate(new Date(n.getFullYear(), n.getMonth(), n.getDate() - 29)), todayISO()];
    },
  },
  {
    label: "This year",
    range: () => [`${new Date().getFullYear()}-01-01`, todayISO()],
  },
];

interface FilterBarProps {
  filters: ExpenseFilters;
  onChange: (f: ExpenseFilters) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
}

export function FilterBar({ filters, onChange, sort, onSortChange }: FilterBarProps) {
  const set = <K extends keyof ExpenseFilters>(key: K, value: ExpenseFilters[K]) => onChange({ ...filters, [key]: value });
  const isDirty = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);
  const rangeInvalid = filters.from && filters.to && filters.from > filters.to;
  const control =
    "block w-full rounded-lg border-0 bg-white py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-inset focus:ring-brand-500";

  return (
    <div className="card space-y-3 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))]">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
          <label htmlFor="f-search" className="sr-only">
            Search expenses
          </label>
          <input
            id="f-search"
            type="search"
            placeholder="Search description, category, amount…"
            value={filters.search}
            onChange={(e) => set("search", e.target.value)}
            className={`${control} pl-9 pr-3`}
          />
        </div>

        <div>
          <label htmlFor="f-category" className="sr-only">
            Category
          </label>
          <select
            id="f-category"
            value={filters.category}
            onChange={(e) => set("category", e.target.value as ExpenseFilters["category"])}
            className={`${control} pl-3 pr-8`}
          >
            <option value="All">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-from" className="sr-only">
            From date
          </label>
          <input
            id="f-from"
            type="date"
            value={filters.from}
            max={filters.to || undefined}
            onChange={(e) => set("from", e.target.value)}
            className={`${control} px-3`}
            title="From date"
          />
        </div>

        <div>
          <label htmlFor="f-to" className="sr-only">
            To date
          </label>
          <input
            id="f-to"
            type="date"
            value={filters.to}
            min={filters.from || undefined}
            onChange={(e) => set("to", e.target.value)}
            className={`${control} px-3`}
            title="To date"
          />
        </div>

        <div>
          <label htmlFor="f-sort" className="sr-only">
            Sort by
          </label>
          <select
            id="f-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortKey)}
            className={`${control} pl-3 pr-8`}
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="amount-desc">Highest amount</option>
            <option value="amount-asc">Lowest amount</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Quick range</span>
        {PRESETS.map((p) => {
          const [from, to] = p.range();
          const active = filters.from === from && filters.to === to;
          return (
            <button
              key={p.label}
              onClick={() => onChange({ ...filters, from: active ? "" : from, to: active ? "" : to })}
              aria-pressed={active}
              className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset transition ${
                active ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {p.label}
            </button>
          );
        })}
        {isDirty && (
          <button
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Clear filters
          </button>
        )}
      </div>
      {rangeInvalid && (
        <p className="text-sm text-red-600" role="alert">
          The “from” date is after the “to” date — no expenses can match.
        </p>
      )}
    </div>
  );
}

"use client";

import { Check, FileJson, FileSpreadsheet, FileText, RotateCcw, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { EXPORTERS } from "@/lib/export";
import { COLUMN_LABELS, EXPORT_COLUMNS, type ExportFormat, type ExportSort } from "@/lib/export/types";
import { toISODate, todayISO } from "@/lib/format";
import { CATEGORIES, type Category } from "@/lib/types";
import type { useExportForm } from "./useExportForm";

type Form = ReturnType<typeof useExportForm>;

const FORMAT_ICONS: Record<ExportFormat, LucideIcon> = { csv: FileSpreadsheet, json: FileJson, pdf: FileText };

const PRESETS: { label: string; range: () => [string, string] }[] = [
  { label: "All time", range: () => ["", ""] },
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
    label: "Last 3 months",
    range: () => {
      const n = new Date();
      return [toISODate(new Date(n.getFullYear(), n.getMonth() - 2, 1)), todayISO()];
    },
  },
  { label: "Year to date", range: () => [`${new Date().getFullYear()}-01-01`, todayISO()] },
  {
    label: "Last year",
    range: () => {
      const y = new Date().getFullYear() - 1;
      return [`${y}-01-01`, `${y}-12-31`];
    },
  },
];

export function ExportOptionsPanel({ form, disabled }: { form: Form; disabled: boolean }) {
  const { state, dispatch, categoryCounts, errors, cleanFilename } = form;
  const ext = EXPORTERS[state.format].extension;
  const control =
    "block w-full rounded-lg border-0 bg-white py-2 text-sm text-slate-900 shadow-sm ring-1 ring-inset focus:ring-2 focus:ring-inset focus:ring-brand-500 disabled:opacity-60";

  return (
    <fieldset disabled={disabled} className="space-y-7">
      {/* 1. Format */}
      <Section step={1} title="Format">
        <div role="radiogroup" aria-label="Export format" className="grid grid-cols-3 gap-2">
          {(Object.keys(EXPORTERS) as ExportFormat[]).map((f) => {
            const Icon = FORMAT_ICONS[f];
            const active = state.format === f;
            return (
              <label
                key={f}
                title={EXPORTERS[f].description}
                className={`relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center ring-1 ring-inset transition focus-within:ring-2 focus-within:ring-brand-500 ${
                  active ? "bg-brand-50 ring-2 ring-brand-500" : "bg-white ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="export-format"
                  value={f}
                  checked={active}
                  onChange={() => dispatch({ type: "format", value: f })}
                  className="sr-only"
                />
                {active && (
                  <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                )}
                <Icon className={`h-6 w-6 ${active ? "text-brand-600" : "text-slate-400"}`} aria-hidden />
                <span className={`text-sm font-semibold ${active ? "text-brand-800" : "text-slate-700"}`}>{EXPORTERS[f].label}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">{EXPORTERS[state.format].description}</p>
      </Section>

      {/* 2. Date range */}
      <Section step={2} title="Date range" error={errors.range}>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {PRESETS.map((p) => {
            const [from, to] = p.range();
            const active = state.from === from && state.to === to;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => dispatch({ type: "range", from, to })}
                aria-pressed={active}
                className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
                  active ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="exp-from" className="mb-1 block text-xs font-medium text-slate-500">
              Start date
            </label>
            <input
              id="exp-from"
              type="date"
              value={state.from}
              max={state.to || todayISO()}
              onChange={(e) => dispatch({ type: "range", from: e.target.value, to: state.to })}
              className={`${control} px-2.5 ${errors.range ? "ring-red-300" : "ring-slate-200"}`}
            />
          </div>
          <div>
            <label htmlFor="exp-to" className="mb-1 block text-xs font-medium text-slate-500">
              End date
            </label>
            <input
              id="exp-to"
              type="date"
              value={state.to}
              min={state.from || undefined}
              onChange={(e) => dispatch({ type: "range", from: state.from, to: e.target.value })}
              className={`${control} px-2.5 ${errors.range ? "ring-red-300" : "ring-slate-200"}`}
            />
          </div>
        </div>
      </Section>

      {/* 3. Categories */}
      <Section
        step={3}
        title="Categories"
        error={errors.categories}
        action={
          <div className="flex gap-2 text-xs font-medium">
            <button
              type="button"
              className="text-brand-600 hover:text-brand-700 disabled:text-slate-300"
              disabled={state.categories.length === CATEGORIES.length}
              onClick={() => dispatch({ type: "categories", value: [...CATEGORIES] })}
            >
              Select all
            </button>
            <span className="text-slate-300" aria-hidden>
              |
            </span>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-700 disabled:text-slate-300"
              disabled={state.categories.length === 0}
              onClick={() => dispatch({ type: "categories", value: [] })}
            >
              Clear
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          {CATEGORIES.map((c: Category) => {
            const checked = state.categories.includes(c);
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm ring-1 ring-inset transition focus-within:ring-2 focus-within:ring-brand-500 ${
                  checked ? "bg-white text-slate-900 ring-slate-300" : "bg-slate-50 text-slate-400 ring-slate-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => dispatch({ type: "toggleCategory", value: c })}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: CATEGORY_META[c].color, opacity: checked ? 1 : 0.4 }}
                  aria-hidden
                />
                <span className="flex-1 truncate font-medium">{c}</span>
                <span className="text-xs tabular-nums text-slate-400">{categoryCounts[c]}</span>
              </label>
            );
          })}
        </div>
      </Section>

      {/* 4. Columns & order */}
      <Section step={4} title="Columns & order" error={errors.columns}>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Columns to include">
          {EXPORT_COLUMNS.map((col) => {
            const on = state.columns.includes(col);
            return (
              <button
                key={col}
                type="button"
                aria-pressed={on}
                onClick={() => dispatch({ type: "toggleColumn", value: col })}
                className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset transition ${
                  on ? "bg-brand-50 text-brand-800 ring-brand-200" : "bg-white text-slate-400 ring-slate-200 line-through"
                }`}
              >
                {on && <Check className="h-3 w-3" aria-hidden />}
                {COLUMN_LABELS[col]}
              </button>
            );
          })}
        </div>
        <div className="mt-2.5">
          <label htmlFor="exp-sort" className="mb-1 block text-xs font-medium text-slate-500">
            Sort rows by
          </label>
          <select
            id="exp-sort"
            value={state.sort}
            onChange={(e) => dispatch({ type: "sort", value: e.target.value as ExportSort })}
            className={`${control} pl-2.5 pr-8 ring-slate-200`}
          >
            <option value="date-desc">Date — newest first</option>
            <option value="date-asc">Date — oldest first</option>
            <option value="amount-desc">Amount — highest first</option>
          </select>
        </div>
      </Section>

      {/* 5. File name */}
      <Section
        step={5}
        title="File name"
        error={errors.filename}
        action={
          state.filenameEdited ? (
            <button
              type="button"
              onClick={() => dispatch({ type: "resetFilename" })}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              <RotateCcw className="h-3 w-3" aria-hidden /> Auto-name
            </button>
          ) : null
        }
      >
        <label htmlFor="exp-filename" className="sr-only">
          File name
        </label>
        <div
          className={`flex rounded-lg bg-white shadow-sm ring-1 ring-inset focus-within:ring-2 focus-within:ring-brand-500 ${
            errors.filename ? "ring-red-300" : "ring-slate-200"
          }`}
        >
          <input
            id="exp-filename"
            type="text"
            value={state.filename}
            onChange={(e) => dispatch({ type: "filename", value: e.target.value })}
            spellCheck={false}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-l-lg border-0 bg-transparent px-2.5 py-2 font-mono text-[13px] text-slate-900 focus:ring-0"
          />
          <span className="flex items-center rounded-r-lg border-l border-slate-200 bg-slate-50 px-2.5 font-mono text-[13px] text-slate-500">
            .{ext}
          </span>
        </div>
        {cleanFilename && cleanFilename !== state.filename && (
          <p className="mt-1.5 text-xs text-slate-500">
            Will be saved as <span className="font-mono text-slate-700">{cleanFilename}.{ext}</span>
          </p>
        )}
      </Section>
    </fieldset>
  );
}

function Section({
  step,
  title,
  error,
  action,
  children,
}: {
  step: number;
  title: string;
  error?: string | null;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
            {step}
          </span>
          {title}
        </h3>
        {action}
      </div>
      {children}
      {error && (
        <p className="mt-1.5 text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}


"use client";

import { useEffect, useMemo, useReducer } from "react";
import {
  defaultFilename,
  EXPORT_COLUMNS,
  sanitizeFilename,
  selectRows,
  summarize,
  type ExportColumn,
  type ExportFormat,
  type ExportOptions,
  type ExportSort,
} from "@/lib/export";
import { CATEGORIES, type Category, type Expense } from "@/lib/types";

const PREFS_KEY = "expense-tracker:export-prefs:v1";

type Prefs = Pick<ExportOptions, "format" | "columns" | "sort">;

function loadPrefs(): Partial<Prefs> {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
  } catch {
    return {};
  }
}

interface State extends ExportOptions {
  filenameEdited: boolean;
}

type Action =
  | { type: "format"; value: ExportFormat }
  | { type: "range"; from: string; to: string }
  | { type: "toggleCategory"; value: Category }
  | { type: "categories"; value: Category[] }
  | { type: "toggleColumn"; value: ExportColumn }
  | { type: "sort"; value: ExportSort }
  | { type: "filename"; value: string }
  | { type: "resetFilename" };

function withAutoName(s: State): State {
  return s.filenameEdited ? s : { ...s, filename: defaultFilename(s, CATEGORIES.length) };
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "format":
      return { ...s, format: a.value };
    case "range":
      return withAutoName({ ...s, from: a.from, to: a.to });
    case "toggleCategory":
      return withAutoName({
        ...s,
        categories: s.categories.includes(a.value)
          ? s.categories.filter((c) => c !== a.value)
          : CATEGORIES.filter((c) => c === a.value || s.categories.includes(c)),
      });
    case "categories":
      return withAutoName({ ...s, categories: a.value });
    case "toggleColumn":
      return {
        ...s,
        columns: s.columns.includes(a.value) ? s.columns.filter((c) => c !== a.value) : [...s.columns, a.value],
      };
    case "sort":
      return { ...s, sort: a.value };
    case "filename":
      return { ...s, filename: a.value, filenameEdited: true };
    case "resetFilename":
      return withAutoName({ ...s, filenameEdited: false });
  }
}

export interface ExportSeed {
  from?: string;
  to?: string;
  categories?: Category[];
}

export function useExportForm(expenses: Expense[], seed: ExportSeed) {
  const [state, dispatch] = useReducer(reducer, undefined, (): State => {
    const prefs = loadPrefs();
    return withAutoName({
      format: prefs.format ?? "csv",
      columns: prefs.columns?.filter((c) => (EXPORT_COLUMNS as readonly string[]).includes(c)) ?? [...EXPORT_COLUMNS],
      sort: prefs.sort ?? "date-desc",
      from: seed.from ?? "",
      to: seed.to ?? "",
      categories: seed.categories ?? [...CATEGORIES],
      filename: "",
      filenameEdited: false,
    });
  });

  // Remember format/columns/sort for next time.
  useEffect(() => {
    try {
      const prefs: Prefs = { format: state.format, columns: state.columns, sort: state.sort };
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* non-critical */
    }
  }, [state.format, state.columns, state.sort]);

  const rows = useMemo(() => selectRows(expenses, state), [expenses, state]);
  const summary = useMemo(() => summarize(rows), [rows]);

  /** Per-category counts within the chosen date range (ignores category selection), for the chips. */
  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    for (const e of expenses) {
      if ((!state.from || e.date >= state.from) && (!state.to || e.date <= state.to)) counts[e.category]++;
    }
    return counts;
  }, [expenses, state.from, state.to]);

  const cleanFilename = sanitizeFilename(state.filename);
  const errors = {
    range: state.from && state.to && state.from > state.to ? "Start date is after end date." : null,
    categories: state.categories.length === 0 ? "Select at least one category." : null,
    columns: state.columns.length === 0 ? "Select at least one column." : null,
    filename: !cleanFilename ? "Enter a file name." : null,
  };
  const hasErrors = Object.values(errors).some(Boolean);

  const options: ExportOptions = {
    format: state.format,
    from: state.from,
    to: state.to,
    categories: state.categories,
    columns: state.columns,
    sort: state.sort,
    filename: cleanFilename,
  };

  return { state, dispatch, rows, summary, categoryCounts, errors, hasErrors, options, cleanFilename };
}

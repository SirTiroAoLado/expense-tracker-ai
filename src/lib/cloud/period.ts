import { toISODate, todayISO } from "../format";

export type PeriodId = "this-month" | "last-month" | "last-3-months" | "this-year" | "last-year" | "all";

export interface PeriodRange {
  id: PeriodId;
  label: string;
  from: string; // "" = open
  to: string; // "" = open
  /** The equivalent previous period, for "vs last period" insights. */
  previous: { from: string; to: string } | null;
}

export const PERIODS: { id: PeriodId; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "this-year", label: "This year" },
  { id: "last-year", label: "Last year" },
  { id: "all", label: "All time" },
];

export function resolvePeriod(id: PeriodId, now = new Date()): PeriodRange {
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = (yy: number, mm: number, dd: number) => toISODate(new Date(yy, mm, dd));
  const label = PERIODS.find((p) => p.id === id)!.label;
  switch (id) {
    case "this-month":
      return { id, label, from: d(y, m, 1), to: todayISO(), previous: { from: d(y, m - 1, 1), to: d(y, m, 0) } };
    case "last-month":
      return { id, label, from: d(y, m - 1, 1), to: d(y, m, 0), previous: { from: d(y, m - 2, 1), to: d(y, m - 1, 0) } };
    case "last-3-months":
      return { id, label, from: d(y, m - 2, 1), to: todayISO(), previous: { from: d(y, m - 5, 1), to: d(y, m - 2, 0) } };
    case "this-year":
      return { id, label, from: `${y}-01-01`, to: todayISO(), previous: { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` } };
    case "last-year":
      return { id, label, from: `${y - 1}-01-01`, to: `${y - 1}-12-31`, previous: { from: `${y - 2}-01-01`, to: `${y - 2}-12-31` } };
    case "all":
      return { id, label, from: "", to: "", previous: null };
  }
}

export function inRange(date: string, from: string, to: string): boolean {
  return (!from || date >= from) && (!to || date <= to);
}

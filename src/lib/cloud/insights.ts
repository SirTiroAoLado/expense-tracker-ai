import { sum, totalsByCategory } from "../analytics";
import { formatCurrency, formatDate, parseISODate } from "../format";
import type { Category, CurrencyCode, Expense } from "../types";
import { inRange, type PeriodRange } from "./period";

export interface Insights {
  count: number;
  total: number;
  previousTotal: number | null;
  changePct: number | null;
  topCategory: { category: Category; total: number; share: number } | null;
  largest: Expense | null;
  busiestWeekday: string | null;
  /** Human sentences, used in email bodies, Slack digests and shared reports. */
  headlines: string[];
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function computeInsights(all: Expense[], period: PeriodRange, currency: CurrencyCode): Insights {
  const rows = all.filter((e) => inRange(e.date, period.from, period.to));
  const total = sum(rows);
  const prevRows = period.previous ? all.filter((e) => inRange(e.date, period.previous!.from, period.previous!.to)) : null;
  const previousTotal = prevRows ? sum(prevRows) : null;
  const changePct = previousTotal && previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : null;

  const top = totalsByCategory(rows).sort((a, b) => b.total - a.total)[0];
  const topCategory = top && top.total > 0 ? { category: top.category, total: top.total, share: (top.total / total) * 100 } : null;
  const largest = rows.reduce<Expense | null>((max, e) => (!max || e.amount > max.amount ? e : max), null);

  const byDay = new Array(7).fill(0) as number[];
  rows.forEach((e) => (byDay[parseISODate(e.date).getDay()] += e.amount));
  const busiest = rows.length ? WEEKDAYS[byDay.indexOf(Math.max(...byDay))] : null;

  const money = (n: number) => formatCurrency(n, currency);
  const headlines: string[] = [];
  if (rows.length === 0) headlines.push(`No expenses recorded for ${period.label.toLowerCase()}.`);
  else {
    headlines.push(`You spent ${money(total)} across ${rows.length} expense${rows.length === 1 ? "" : "s"} (${period.label.toLowerCase()}).`);
    if (changePct !== null)
      headlines.push(
        `That's ${Math.abs(changePct).toFixed(0)}% ${changePct >= 0 ? "more" : "less"} than the previous period (${money(previousTotal!)}).`,
      );
    if (topCategory)
      headlines.push(`${topCategory.category} was your biggest category at ${money(topCategory.total)} (${topCategory.share.toFixed(0)}%).`);
    if (largest) headlines.push(`Largest single expense: ${largest.description} — ${money(largest.amount)} on ${formatDate(largest.date)}.`);
    if (busiest && rows.length >= 5) headlines.push(`You tend to spend the most on ${busiest}s.`);
  }

  return { count: rows.length, total, previousTotal, changePct, topCategory, largest, busiestWeekday: busiest, headlines };
}

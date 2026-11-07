import { monthKey, roundMoney, toISODate } from "./format";
import { CATEGORIES, type Category, type Expense, type ExpenseFilters, type SortKey } from "./types";

export function filterExpenses(expenses: Expense[], f: ExpenseFilters): Expense[] {
  const q = f.search.trim().toLowerCase();
  return expenses.filter((e) => {
    if (f.category !== "All" && e.category !== f.category) return false;
    if (f.from && e.date < f.from) return false;
    if (f.to && e.date > f.to) return false;
    if (q) {
      const hay = `${e.description} ${e.category} ${e.amount.toFixed(2)}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortExpenses(expenses: Expense[], sort: SortKey): Expense[] {
  const list = [...expenses];
  const byDate = (a: Expense, b: Expense) =>
    a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date);
  switch (sort) {
    case "date-asc":
      return list.sort(byDate);
    case "date-desc":
      return list.sort((a, b) => byDate(b, a));
    case "amount-asc":
      return list.sort((a, b) => a.amount - b.amount);
    case "amount-desc":
      return list.sort((a, b) => b.amount - a.amount);
  }
}

export function sum(expenses: Expense[]): number {
  return roundMoney(expenses.reduce((acc, e) => acc + e.amount, 0));
}

export function totalsByCategory(expenses: Expense[]): { category: Category; total: number; count: number }[] {
  const map = new Map<Category, { total: number; count: number }>();
  for (const c of CATEGORIES) map.set(c, { total: 0, count: 0 });
  for (const e of expenses) {
    const entry = map.get(e.category)!;
    entry.total += e.amount;
    entry.count += 1;
  }
  return CATEGORIES.map((category) => ({
    category,
    total: roundMoney(map.get(category)!.total),
    count: map.get(category)!.count,
  }));
}

/** Totals for the last `months` calendar months, oldest first, including empty months. */
export function monthlyTotals(expenses: Expense[], months: number, now = new Date()): { key: string; total: number }[] {
  const keys: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    keys.push(toISODate(new Date(now.getFullYear(), now.getMonth() - i, 1)).slice(0, 7));
  }
  const map = new Map(keys.map((k) => [k, 0]));
  for (const e of expenses) {
    const k = monthKey(e.date);
    if (map.has(k)) map.set(k, map.get(k)! + e.amount);
  }
  return keys.map((key) => ({ key, total: roundMoney(map.get(key)!) }));
}

export function currentMonthKey(now = new Date()): string {
  return toISODate(now).slice(0, 7);
}

export function previousMonthKey(now = new Date()): string {
  return toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)).slice(0, 7);
}

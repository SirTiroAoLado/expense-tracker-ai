import { CATEGORIES, type CurrencyCode, type Expense } from "./types";

export const EXPENSES_KEY = "expense-tracker:expenses:v1";
export const CURRENCY_KEY = "expense-tracker:currency:v1";

function isExpense(value: unknown): value is Expense {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.id === "string" &&
    typeof e.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(e.date) &&
    typeof e.amount === "number" &&
    Number.isFinite(e.amount) &&
    typeof e.category === "string" &&
    (CATEGORIES as readonly string[]).includes(e.category) &&
    typeof e.description === "string"
  );
}

export function loadExpenses(): Expense[] {
  const raw = window.localStorage.getItem(EXPENSES_KEY);
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error("Stored expense data is corrupted.");
  // Drop malformed rows rather than failing the whole app.
  return parsed.filter(isExpense);
}

export function saveExpenses(expenses: Expense[]): void {
  window.localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

export function loadCurrency(): CurrencyCode | null {
  try {
    return (window.localStorage.getItem(CURRENCY_KEY) as CurrencyCode | null) ?? null;
  } catch {
    return null;
  }
}

export function saveCurrency(code: CurrencyCode): void {
  try {
    window.localStorage.setItem(CURRENCY_KEY, code);
  } catch {
    /* non-critical */
  }
}

export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

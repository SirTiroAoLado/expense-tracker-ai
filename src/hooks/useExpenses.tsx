"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { roundMoney, toISODate } from "@/lib/format";
import {
  EXPENSES_KEY,
  generateId,
  loadCurrency,
  loadExpenses,
  saveCurrency,
  saveExpenses,
} from "@/lib/storage";
import { CATEGORIES, type CurrencyCode, type Expense, type ExpenseInput } from "@/lib/types";

interface ExpensesContextValue {
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  addExpense: (input: ExpenseInput) => Expense;
  updateExpense: (id: string, input: ExpenseInput) => void;
  deleteExpense: (id: string) => Expense | undefined;
  restoreExpense: (expense: Expense) => void;
  clearAll: () => void;
  loadSampleData: () => void;
  dismissError: () => void;
}

const ExpensesContext = createContext<ExpensesContextValue | null>(null);

export function ExpensesProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrencyState] = useState<CurrencyCode>("USD");
  const hydrated = useRef(false);

  // Hydrate from localStorage once on mount (client only).
  useEffect(() => {
    try {
      setExpenses(loadExpenses());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read saved expenses.");
    }
    const c = loadCurrency();
    if (c) setCurrencyState(c);
    hydrated.current = true;
    setIsLoading(false);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      saveExpenses(expenses);
    } catch {
      setError("Could not save your changes — browser storage may be full or disabled.");
    }
  }, [expenses]);

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== EXPENSES_KEY) return;
      try {
        setExpenses(loadExpenses());
      } catch {
        /* ignore malformed external writes */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    saveCurrency(c);
  }, []);

  const addExpense = useCallback((input: ExpenseInput) => {
    const now = new Date().toISOString();
    const expense: Expense = {
      ...input,
      description: input.description.trim(),
      amount: roundMoney(input.amount),
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              ...input,
              description: input.description.trim(),
              amount: roundMoney(input.amount),
              updatedAt: new Date().toISOString(),
            }
          : e,
      ),
    );
  }, []);

  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  const deleteExpense = useCallback((id: string) => {
    const target = expensesRef.current.find((e) => e.id === id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    return target;
  }, []);

  const restoreExpense = useCallback((expense: Expense) => {
    setExpenses((prev) => (prev.some((e) => e.id === expense.id) ? prev : [expense, ...prev]));
  }, []);

  const clearAll = useCallback(() => setExpenses([]), []);

  const loadSampleData = useCallback(() => {
    setExpenses((prev) => [...generateSampleData(), ...prev]);
  }, []);

  const value = useMemo<ExpensesContextValue>(
    () => ({
      expenses,
      isLoading,
      error,
      currency,
      setCurrency,
      addExpense,
      updateExpense,
      deleteExpense,
      restoreExpense,
      clearAll,
      loadSampleData,
      dismissError: () => setError(null),
    }),
    [expenses, isLoading, error, currency, setCurrency, addExpense, updateExpense, deleteExpense, restoreExpense, clearAll, loadSampleData],
  );

  return <ExpensesContext.Provider value={value}>{children}</ExpensesContext.Provider>;
}

export function useExpenses(): ExpensesContextValue {
  const ctx = useContext(ExpensesContext);
  if (!ctx) throw new Error("useExpenses must be used inside <ExpensesProvider>");
  return ctx;
}

/* ---------- sample data for demos ---------- */

const SAMPLE: Record<(typeof CATEGORIES)[number], { desc: string[]; min: number; max: number }> = {
  Food: { desc: ["Groceries", "Lunch with team", "Coffee", "Dinner out", "Bakery", "Takeaway pizza"], min: 4, max: 90 },
  Transportation: { desc: ["Fuel", "Metro pass", "Uber ride", "Parking", "Train ticket"], min: 3, max: 70 },
  Entertainment: { desc: ["Cinema", "Concert tickets", "Streaming subscription", "Board game", "Museum"], min: 8, max: 120 },
  Shopping: { desc: ["New shoes", "Books", "Headphones", "Clothing", "Home decor"], min: 15, max: 200 },
  Bills: { desc: ["Electricity", "Internet", "Phone plan", "Water", "Gym membership"], min: 20, max: 140 },
  Other: { desc: ["Gift", "Haircut", "Pharmacy", "Charity donation"], min: 5, max: 60 },
};

function generateSampleData(): Expense[] {
  const out: Expense[] = [];
  const now = new Date();
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let m = 5; m >= 0; m--) {
    const daysInMonth = m === 0 ? now.getDate() : new Date(now.getFullYear(), now.getMonth() - m + 1, 0).getDate();
    const count = 10 + Math.floor(rand() * 8);
    for (let i = 0; i < count; i++) {
      const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)];
      const spec = SAMPLE[category];
      const day = 1 + Math.floor(rand() * daysInMonth);
      const date = toISODate(new Date(now.getFullYear(), now.getMonth() - m, day));
      const ts = new Date().toISOString();
      out.push({
        id: generateId(),
        date,
        category,
        description: spec.desc[Math.floor(rand() * spec.desc.length)],
        amount: roundMoney(spec.min + rand() * (spec.max - spec.min)),
        createdAt: ts,
        updatedAt: ts,
      });
    }
  }
  return out;
}

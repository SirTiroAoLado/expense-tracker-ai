export const CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  /** ISO calendar date, YYYY-MM-DD (local, no time zone) */
  date: string;
  /** Amount in major currency units, rounded to 2 decimals */
  amount: number;
  category: Category;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseInput = Pick<Expense, "date" | "amount" | "category" | "description">;

export type CurrencyCode = "USD" | "EUR" | "GBP" | "BRL" | "JPY";

export const CURRENCIES: { code: CurrencyCode; label: string }[] = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "BRL", label: "Brazilian Real (R$)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
];

export interface ExpenseFilters {
  search: string;
  category: Category | "All";
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
}

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

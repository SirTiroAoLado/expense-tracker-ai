"use client";

import { Loader2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CATEGORY_META } from "@/lib/categories";
import { todayISO } from "@/lib/format";
import { CATEGORIES, type Category, type CurrencyCode, type Expense, type ExpenseInput } from "@/lib/types";

interface ExpenseFormProps {
  initial?: Expense | null;
  currency: CurrencyCode;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

type Errors = Partial<Record<keyof ExpenseInput, string>>;

const MAX_AMOUNT = 1_000_000;
const MIN_DATE = "2000-01-01";

function validate(values: { date: string; amount: string; category: string; description: string }): Errors {
  const errors: Errors = {};
  const today = todayISO();

  if (!values.date) errors.date = "Please choose a date.";
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date) || Number.isNaN(Date.parse(values.date)))
    errors.date = "Enter a valid date.";
  else if (values.date > today) errors.date = "Date can't be in the future.";
  else if (values.date < MIN_DATE) errors.date = "Date must be in the year 2000 or later.";

  const raw = values.amount.trim().replace(",", ".");
  const amount = Number(raw);
  if (!raw) errors.amount = "Amount is required.";
  else if (!/^\d+(\.\d{0,2})?$/.test(raw) || Number.isNaN(amount)) errors.amount = "Use a number with up to 2 decimals.";
  else if (amount <= 0) errors.amount = "Amount must be greater than zero.";
  else if (amount > MAX_AMOUNT) errors.amount = "Amount must be under 1,000,000.";

  if (!(CATEGORIES as readonly string[]).includes(values.category)) errors.category = "Pick a category.";

  const desc = values.description.trim();
  if (!desc) errors.description = "Add a short description.";
  else if (desc.length < 2) errors.description = "Description is too short.";
  else if (desc.length > 100) errors.description = "Keep it under 100 characters.";

  return errors;
}

const currencySymbol = (currency: CurrencyCode) =>
  new Intl.NumberFormat(undefined, { style: "currency", currency })
    .formatToParts(0)
    .find((p) => p.type === "currency")?.value ?? "$";

export function ExpenseForm({ initial, currency, onSubmit, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState({
    date: initial?.date ?? todayISO(),
    amount: initial ? initial.amount.toFixed(2) : "",
    category: (initial?.category ?? "") as Category | "",
    description: initial?.description ?? "",
  });
  const [touched, setTouched] = useState<Partial<Record<keyof ExpenseInput, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = validate(values);
  const showError = (field: keyof ExpenseInput) => (touched[field] || submitted ? errors[field] : undefined);

  const set = (field: keyof typeof values) => (value: string) => setValues((v) => ({ ...v, [field]: value }));
  const blur = (field: keyof ExpenseInput) => () => setTouched((t) => ({ ...t, [field]: true }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length > 0) {
      const firstInvalid = (["date", "amount", "category", "description"] as const).find((f) => errors[f]);
      if (firstInvalid) document.getElementById(`expense-${firstInvalid}`)?.focus();
      return;
    }
    setSaving(true);
    onSubmit({
      date: values.date,
      amount: Number(values.amount.trim().replace(",", ".")),
      category: values.category as Category,
      description: values.description.trim(),
    });
  };

  const inputBase =
    "block w-full rounded-lg border-0 bg-white py-2.5 text-slate-900 shadow-sm ring-1 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-inset sm:text-sm";
  const ringFor = (field: keyof ExpenseInput) =>
    showError(field) ? "ring-red-300 focus:ring-red-500" : "ring-slate-300 focus:ring-brand-500";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="expense-amount" label="Amount" error={showError("amount")}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-slate-500">
              {currencySymbol(currency)}
            </span>
            <input
              id="expense-amount"
              data-autofocus
              inputMode="decimal"
              autoComplete="off"
              placeholder="0.00"
              value={values.amount}
              onChange={(e) => set("amount")(e.target.value)}
              onBlur={blur("amount")}
              aria-invalid={!!showError("amount")}
              aria-describedby={showError("amount") ? "expense-amount-error" : undefined}
              className={`${inputBase} ${ringFor("amount")} pl-10 pr-3 tabular-nums`}
            />
          </div>
        </Field>

        <Field id="expense-date" label="Date" error={showError("date")}>
          <input
            id="expense-date"
            type="date"
            min={MIN_DATE}
            max={todayISO()}
            value={values.date}
            onChange={(e) => set("date")(e.target.value)}
            onBlur={blur("date")}
            aria-invalid={!!showError("date")}
            aria-describedby={showError("date") ? "expense-date-error" : undefined}
            className={`${inputBase} ${ringFor("date")} px-3`}
          />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-slate-700">Category</legend>
        <div
          id="expense-category"
          tabIndex={-1}
          role="radiogroup"
          aria-invalid={!!showError("category")}
          className="grid grid-cols-2 gap-2 outline-none sm:grid-cols-3"
        >
          {CATEGORIES.map((c) => {
            const Icon = CATEGORY_META[c].icon;
            const active = values.category === c;
            return (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ring-1 ring-inset transition focus-within:ring-2 focus-within:ring-brand-500 ${
                  active ? "bg-brand-50 text-brand-800 ring-brand-500" : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={active}
                  onChange={() => {
                    set("category")(c);
                    setTouched((t) => ({ ...t, category: true }));
                  }}
                  className="sr-only"
                />
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-md"
                  style={{ backgroundColor: `${CATEGORY_META[c].color}1f`, color: CATEGORY_META[c].color }}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {c}
              </label>
            );
          })}
        </div>
        {showError("category") && (
          <p className="mt-1.5 text-sm text-red-600" role="alert">
            {showError("category")}
          </p>
        )}
      </fieldset>

      <Field
        id="expense-description"
        label="Description"
        error={showError("description")}
        hint={`${values.description.trim().length}/100`}
      >
        <input
          id="expense-description"
          type="text"
          maxLength={120}
          placeholder="e.g. Weekly groceries"
          value={values.description}
          onChange={(e) => set("description")(e.target.value)}
          onBlur={blur("description")}
          aria-invalid={!!showError("description")}
          aria-describedby={showError("description") ? "expense-description-error" : undefined}
          className={`${inputBase} ${ringFor("description")} px-3`}
        />
      </Field>

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="btn-primary">
          {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {initial ? "Save changes" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        {hint && <span className="text-xs tabular-nums text-slate-400">{hint}</span>}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

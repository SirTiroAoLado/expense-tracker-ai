"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { ExpenseModal } from "@/components/ExpenseModal";
import type { Expense } from "@/lib/types";

interface DialogContextValue {
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function ExpenseDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ open: boolean; expense: Expense | null }>({ open: false, expense: null });

  const openCreate = useCallback(() => setState({ open: true, expense: null }), []);
  const openEdit = useCallback((expense: Expense) => setState({ open: true, expense }), []);
  const close = useCallback(() => setState((s) => ({ ...s, open: false })), []);

  return (
    <DialogContext.Provider value={{ openCreate, openEdit }}>
      {children}
      {state.open && <ExpenseModal expense={state.expense} onClose={close} />}
    </DialogContext.Provider>
  );
}

export function useExpenseDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useExpenseDialog must be used inside <ExpenseDialogProvider>");
  return ctx;
}

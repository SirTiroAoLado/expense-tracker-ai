"use client";

import type { ReactNode } from "react";
import { ExpenseDialogProvider } from "@/hooks/useExpenseDialog";
import { ExpensesProvider } from "@/hooks/useExpenses";
import { ToastProvider } from "@/hooks/useToast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <ExpenseDialogProvider>{children}</ExpenseDialogProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}

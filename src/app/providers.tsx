"use client";

import type { ReactNode } from "react";
import { ExpenseDialogProvider } from "@/hooks/useExpenseDialog";
import { ExpensesProvider } from "@/hooks/useExpenses";
import { ExportDrawerProvider } from "@/hooks/useExportDrawer";
import { ToastProvider } from "@/hooks/useToast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <ExpenseDialogProvider>
          <ExportDrawerProvider>{children}</ExportDrawerProvider>
        </ExpenseDialogProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}

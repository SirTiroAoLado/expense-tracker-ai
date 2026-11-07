"use client";

import type { ReactNode } from "react";
import { CloudProvider } from "@/hooks/useCloud";
import { ExpenseDialogProvider } from "@/hooks/useExpenseDialog";
import { ExpensesProvider } from "@/hooks/useExpenses";
import { ExportFlowProvider } from "@/hooks/useExportFlow";
import { ToastProvider } from "@/hooks/useToast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ExpensesProvider>
        <CloudProvider>
          <ExpenseDialogProvider>
            <ExportFlowProvider>{children}</ExportFlowProvider>
          </ExpenseDialogProvider>
        </CloudProvider>
      </ExpensesProvider>
    </ToastProvider>
  );
}

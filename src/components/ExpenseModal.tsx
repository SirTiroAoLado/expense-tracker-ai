"use client";

import { useExpenses } from "@/hooks/useExpenses";
import { useToast } from "@/hooks/useToast";
import { formatCurrency } from "@/lib/format";
import type { Expense, ExpenseInput } from "@/lib/types";
import { ExpenseForm } from "./ExpenseForm";
import { Modal } from "./Modal";

export function ExpenseModal({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const { addExpense, updateExpense, currency } = useExpenses();
  const { toast } = useToast();

  const handleSubmit = (input: ExpenseInput) => {
    if (expense) {
      updateExpense(expense.id, input);
      toast("Expense updated");
    } else {
      addExpense(input);
      toast(`Added ${formatCurrency(input.amount, currency)} · ${input.category}`);
    }
    onClose();
  };

  return (
    <Modal
      title={expense ? "Edit expense" : "New expense"}
      description={expense ? "Update the details of this expense." : "Record what you spent and where."}
      onClose={onClose}
    >
      <ExpenseForm initial={expense} currency={currency} onSubmit={handleSubmit} onCancel={onClose} />
    </Modal>
  );
}

import type { Metadata } from "next"

import { BudgetForm } from "@/features/budgets/components/budget-form"

export const metadata: Metadata = {
  title: "New Budget",
}

export default function NewBudgetPage() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <BudgetForm defaultYear={new Date().getUTCFullYear()} />
    </div>
  )
}

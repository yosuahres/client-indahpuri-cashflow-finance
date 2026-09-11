import type { Metadata } from "next"

import { BudgetForm } from "@/features/budgets/components/budget-form"
import { listCategories } from "@/features/categories/actions"

export const metadata: Metadata = {
  title: "New Budget",
}

export default async function NewBudgetPage() {
  const categories = await listCategories()

  // The month being lived in is the one most plans are entered for.
  const now = new Date()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <BudgetForm
        defaultYear={now.getUTCFullYear()}
        defaultMonth={now.getUTCMonth() + 1}
        initialCategories={categories.categories}
        setupError={categories.ok ? undefined : categories.error}
      />
    </div>
  )
}

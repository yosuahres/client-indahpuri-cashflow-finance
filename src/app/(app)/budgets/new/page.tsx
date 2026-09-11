import type { Metadata } from "next"

import { BudgetForm } from "@/features/budgets/components/budget-form"
import { listCategories } from "@/features/categories/actions"

export const metadata: Metadata = {
  title: "New Budget",
}

export default async function NewBudgetPage() {
  const categories = await listCategories()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <BudgetForm
        defaultYear={new Date().getUTCFullYear()}
        initialCategories={categories.categories}
        setupError={categories.ok ? undefined : categories.error}
      />
    </div>
  )
}

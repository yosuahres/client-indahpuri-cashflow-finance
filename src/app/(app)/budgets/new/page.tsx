import type { Metadata } from "next"

import { BudgetForm } from "@/features/budgets/components/budget-form"
import { readBudgetPeriod } from "@/features/budgets/period"
import { listCategories } from "@/features/categories/actions"

export const metadata: Metadata = {
  title: "New Budget",
}

export default async function NewBudgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  // Opened from the Anggaran list, the form starts on the period that list was
  // showing; opened cold, on the month being lived in.
  const [params, categories] = await Promise.all([searchParams, listCategories()])
  const selection = readBudgetPeriod(params)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <BudgetForm
        defaultPeriod={selection.period}
        defaultYear={selection.year}
        defaultMonth={selection.month}
        initialCategories={categories.categories}
        setupError={categories.ok ? undefined : categories.error}
      />
    </div>
  )
}

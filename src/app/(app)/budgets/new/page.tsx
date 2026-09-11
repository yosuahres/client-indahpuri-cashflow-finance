import type { Metadata } from "next"

import { BudgetGrid } from "@/features/budgets/components/budget-grid"
import { readBudgetPeriod } from "@/features/budgets/period"
import { loadBudgetPlan } from "@/features/budgets/plan"
import { listAccounts } from "@/features/accounts/actions"
import { listCategories } from "@/features/categories/actions"
import { isKind, type TransactionKind } from "@/lib/finance"

export const metadata: Metadata = {
  title: "Budget Plan",
}

export default async function NewBudgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const selection = readBudgetPeriod(params)
  const kind: TransactionKind = isKind(params.kind) ? params.kind : "expense"
  const asked = typeof params.account === "string" ? params.account.trim() : ""

  // The pickers and the plan go out together: they share the one
  // request-scoped Supabase client, which serializes its own token refresh, so
  // this waits for the slowest query rather than for the sum of them.
  const [accounts, categories] = await Promise.all([listAccounts(), listCategories()])

  // Landing here with no account named opens on the first one rather than on
  // an empty grid with nothing to fill in.
  const account = asked || accounts.accounts[0]?.name || ""

  const plan = await loadBudgetPlan({
    account,
    year: selection.year,
    kind,
    monthly: selection.period === "monthly",
  })

  const setupError = !accounts.ok
    ? accounts.error
    : !categories.ok
      ? categories.error
      : undefined

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {/* Keyed on the slice: a different account, year, direction or cadence is
          a different plan, and the grid's rows start from that one's figures. */}
      <BudgetGrid
        key={`${account}:${kind}:${selection.period}:${selection.year}`}
        account={account}
        kind={kind}
        period={selection.period}
        year={selection.year}
        accounts={accounts.accounts}
        categories={categories.categories}
        seedRows={plan.rows}
        costCenter={plan.costCenter}
        warnOnOverrun={plan.warnOnOverrun}
        loadError={plan.ok ? undefined : plan.error}
        setupError={setupError}
      />
    </div>
  )
}

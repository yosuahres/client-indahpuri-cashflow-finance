import "server-only"

import { createClient } from "@/lib/supabase/server"
import { loadAccountTotals, MIGRATION_HINT, UNDEFINED_TABLE } from "@/features/reports/aggregate"
import type { TransactionKind } from "@/lib/finance"

/** Postgres "column does not exist". */
const UNDEFINED_COLUMN = "42703"

const COLUMN_HINT =
  "The budgets table has no period or account columns yet. Run " +
  "supabase/migrations/0010_budget_period.sql and 0011_budget_account.sql against the project."

/** One account's plan and what actually moved through it, over the range. */
export type PlanVsActualRow = {
  /** Null on plans entered before budgets named an account. */
  account: string | null
  plannedIncome: number
  actualIncome: number
  plannedExpense: number
  actualExpense: number
}

export type PlanVsActualResult = {
  ok: boolean
  error?: string
  rows: PlanVsActualRow[]
  totals: Omit<PlanVsActualRow, "account">
}

type BudgetRow = {
  kind: TransactionKind
  amount: number | string
  period_year: number
  period_month: number | null
  account: string | null
}

const zero = (): Omit<PlanVsActualRow, "account"> => ({
  plannedIncome: 0,
  actualIncome: 0,
  plannedExpense: 0,
  actualExpense: 0,
})

/**
 * Each account's plan set against its actuals, for whatever range the
 * dashboard filters are on.
 *
 * The plan is levelled the same way the Laporan Keuangan levels it: a monthly
 * budget counts in full in its own month, a yearly one a twelfth at a time, so
 * a half-year range carries half a yearly plan. A month is in or out whole —
 * a range that starts mid-month still counts that month's plan, which is the
 * only reading that keeps a fiscal year adding up to its own budget.
 *
 * Actuals here include unpaid bills, which is what every other figure on the
 * dashboard does; the statements, which report cash that moved, do not.
 */
export async function loadPlanVsActual({
  from,
  to,
}: {
  /** `YYYY-MM-DD`. */
  from: string
  to: string
}): Promise<PlanVsActualResult> {
  const supabase = await createClient()

  const fromMonth = from.slice(0, 7)
  const toMonth = to.slice(0, 7)
  const fromYear = Number(from.slice(0, 4))
  const toYear = Number(to.slice(0, 4))

  const [actuals, budgets] = await Promise.all([
    loadAccountTotals(supabase, from, to),
    supabase
      .from("budgets")
      .select("kind, amount, period_year, period_month, account")
      .gte("period_year", fromYear)
      .lte("period_year", toYear),
  ])

  if (!actuals.ok) {
    return { ok: false, error: actuals.error, rows: [], totals: zero() }
  }

  if (budgets.error) {
    return {
      ok: false,
      error:
        budgets.error.code === UNDEFINED_COLUMN
          ? COLUMN_HINT
          : budgets.error.code === UNDEFINED_TABLE
            ? MIGRATION_HINT
            : budgets.error.message,
      rows: [],
      totals: zero(),
    }
  }

  // Keyed by account name; the empty string stands for a plan that names none,
  // since a Map cannot tell null from a missing key as readably.
  const rows = new Map<string, PlanVsActualRow>()
  const at = (account: string | null) => {
    const key = account ?? ""
    const row = rows.get(key) ?? { account, ...zero() }
    rows.set(key, row)
    return row
  }

  const pad = (value: number) => String(value).padStart(2, "0")
  const inRange = (key: string) => key >= fromMonth && key <= toMonth

  for (const budget of (budgets.data ?? []) as BudgetRow[]) {
    const amount = Number(budget.amount) || 0
    if (!amount) continue

    // A monthly plan lands whole in its month; a yearly one spreads over the
    // twelve, so only the months inside the range are counted.
    const months = budget.period_month
      ? [`${budget.period_year}-${pad(budget.period_month)}`]
      : Array.from({ length: 12 }, (_, index) => `${budget.period_year}-${pad(index + 1)}`)

    const perMonth = amount / months.length
    const counted = months.filter(inRange).length
    if (counted === 0) continue

    const row = at(budget.account)
    if (budget.kind === "income") row.plannedIncome += perMonth * counted
    else row.plannedExpense += perMonth * counted
  }

  for (const entry of actuals.rows) {
    const row = at(entry.account)
    if (entry.kind === "income") row.actualIncome += entry.total
    else row.actualExpense += entry.total
  }

  const list = [...rows.values()].sort((a, b) =>
    // The catch-all row has no name to sort by, so it sits at the end.
    a.account === null ? 1 : b.account === null ? -1 : a.account.localeCompare(b.account, "id-ID"),
  )

  const totals = list.reduce<Omit<PlanVsActualRow, "account">>((sums, row) => {
    sums.plannedIncome += row.plannedIncome
    sums.actualIncome += row.actualIncome
    sums.plannedExpense += row.plannedExpense
    sums.actualExpense += row.actualExpense
    return sums
  }, zero())

  return { ok: true, rows: list, totals }
}

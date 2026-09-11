import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { TransactionKind } from "@/lib/finance"
import {
  loadMonthlyTotals,
  MIGRATION_HINT,
  UNDEFINED_TABLE,
} from "@/features/reports/aggregate"

import { lastDayOfMonth, monthKey } from "./months"

const UNDEFINED_COLUMN = "42703"
const BUDGET_COLUMN_HINT =
  "The budgets table is missing columns this report reads. Run the files in " +
  "supabase/migrations against the project, 0010_budget_period.sql included."

export type ReportLine = {
  label: string
  monthBudget: number
  monthActual: number
  prevMonthActual: number
  yearBudget: number
  yearActual: number
  prevYearActual: number
}

/** The six figures every row, total and deviation carries, in column order. */
export type ReportColumns = Omit<ReportLine, "label">

export type FinancialReport = {
  year: number
  month: number
  /** Empty when the statement covers every account. */
  account: string
  income: ReportLine[]
  expense: ReportLine[]
  incomeTotal: ReportColumns
  expenseTotal: ReportColumns
  /** Income less expense, per column. */
  deviation: ReportColumns
}

export type FinancialReportResult = {
  ok: boolean
  error?: string
  report: FinancialReport
}

type BudgetRow = {
  name: string
  kind: TransactionKind
  category: string | null
  amount: number | string
  period_year: number
  /** 1-12 for a plan covering one month; null for one covering the year. */
  period_month: number | null
  /** Null on plans entered before budgets named one — they count everywhere. */
  account: string | null
}

const zeroColumns = (): ReportColumns => ({
  monthBudget: 0,
  monthActual: 0,
  prevMonthActual: 0,
  yearBudget: 0,
  yearActual: 0,
  prevYearActual: 0,
})

/**
 * The months a budget's period covers, which is what the amount is levelled
 * over: one month for a monthly plan, so the whole amount lands there, and
 * twelve for a yearly one, so each month carries a twelfth.
 */
function budgetMonths(budget: BudgetRow) {
  if (!Number.isFinite(budget.period_year)) return []
  if (budget.period_month) return [monthKey(budget.period_year, budget.period_month)]
  return Array.from({ length: 12 }, (_, index) => monthKey(budget.period_year, index + 1))
}

/**
 * Laporan Keuangan: every income and expense category with its plan and its
 * actuals, for the chosen month and for the year to date, each against the
 * same window a year earlier.
 */
export async function loadFinancialReport({
  year,
  month,
  account = "",
}: {
  year: number
  month: number
  /** Narrows both the plan and the actuals to one account. */
  account?: string
}): Promise<FinancialReportResult> {
  const empty: FinancialReport = {
    year,
    month,
    account,
    income: [],
    expense: [],
    incomeTotal: zeroColumns(),
    expenseTotal: zeroColumns(),
    deviation: zeroColumns(),
  }

  const supabase = await createClient()

  // One window covers both years; the buckets below sort out which is which.
  const from = `${year - 1}-01-01`
  const to = lastDayOfMonth(year, month)

  // The plan and the actuals go out together rather than one after the other.
  // Both read through the one request-scoped client, which serializes its own
  // token refresh, so this waits for the slower of the two rather than for the
  // sum of them. A query builder does not issue its request until it is
  // awaited, which is what `Promise.all` does to both at once.
  const [actuals, budgets] = await Promise.all([
    // Actuals are cash that moved, so an expense still unpaid is not one yet.
    loadMonthlyTotals(supabase, from, to, true, account || undefined),
    // Only the year on screen: the columns a budget feeds — this month's plan
    // and the year to date — are both inside it. The prior-year columns are
    // actuals, which have no plan to compare against.
    supabase
      .from("budgets")
      .select("name, kind, category, amount, period_year, period_month, account")
      .eq("period_year", year),
  ])

  if (!actuals.ok) {
    return { ok: false, error: actuals.error, report: empty }
  }

  if (budgets.error) {
    return {
      ok: false,
      error:
        budgets.error.code === UNDEFINED_COLUMN
          ? BUDGET_COLUMN_HINT
          : budgets.error.code === UNDEFINED_TABLE
            ? MIGRATION_HINT
            : budgets.error.message,
      report: empty,
    }
  }

  // kind -> category -> `YYYY-MM` -> amount, one map for plan and one for actual.
  const planned = new Map<string, Map<string, number>>()
  const actual = new Map<string, Map<string, number>>()

  const add = (
    store: Map<string, Map<string, number>>,
    kind: TransactionKind,
    category: string,
    key: string,
    amount: number,
  ) => {
    const rowKey = `${kind} ${category}`
    const months = store.get(rowKey) ?? new Map<string, number>()
    months.set(key, (months.get(key) ?? 0) + amount)
    store.set(rowKey, months)
  }

  for (const row of actuals.rows) {
    add(actual, row.kind, row.category, row.month, row.total)
  }

  for (const budget of (budgets.data ?? []) as BudgetRow[]) {
    // Narrowed in here rather than in the query: a plan naming no account was
    // entered before budgets named one, and the only honest reading of it is
    // "every account", which is awkward to say in a PostgREST filter and
    // trivial to say over a year's worth of rows.
    if (account && budget.account && budget.account !== account) continue

    // A budget with no category plans the whole line under its own name.
    const label = budget.category?.trim() || budget.name

    const months = budgetMonths(budget)
    if (months.length === 0) continue

    const perMonth = (Number(budget.amount) || 0) / months.length
    for (const key of months) {
      add(planned, budget.kind, label, key, perMonth)
    }
  }

  const selected = monthKey(year, month)
  const previous = monthKey(year - 1, month)
  const inYearToDate = (key: string, forYear: number) =>
    key.startsWith(`${forYear}-`) && Number(key.slice(5, 7)) <= month

  const sumMonths = (
    months: Map<string, number> | undefined,
    pick: (key: string) => boolean,
  ) => {
    if (!months) return 0
    let total = 0
    for (const [key, value] of months) if (pick(key)) total += value
    return total
  }

  const build = (kind: TransactionKind): ReportLine[] => {
    const prefix = `${kind} `
    const labels = new Set<string>()
    for (const key of planned.keys()) {
      if (key.startsWith(prefix)) labels.add(key.slice(prefix.length))
    }
    for (const key of actual.keys()) {
      if (key.startsWith(prefix)) labels.add(key.slice(prefix.length))
    }

    return [...labels]
      .sort((a, b) => a.localeCompare(b, "id-ID"))
      .map((label) => {
        const plan = planned.get(prefix + label)
        const real = actual.get(prefix + label)

        return {
          label,
          monthBudget: sumMonths(plan, (key) => key === selected),
          monthActual: sumMonths(real, (key) => key === selected),
          prevMonthActual: sumMonths(real, (key) => key === previous),
          yearBudget: sumMonths(plan, (key) => inYearToDate(key, year)),
          yearActual: sumMonths(real, (key) => inYearToDate(key, year)),
          prevYearActual: sumMonths(real, (key) => inYearToDate(key, year - 1)),
        }
      })
  }

  const income = build("income")
  const expense = build("expense")

  const total = (lines: ReportLine[]) =>
    lines.reduce<ReportColumns>((sums, line) => {
      sums.monthBudget += line.monthBudget
      sums.monthActual += line.monthActual
      sums.prevMonthActual += line.prevMonthActual
      sums.yearBudget += line.yearBudget
      sums.yearActual += line.yearActual
      sums.prevYearActual += line.prevYearActual
      return sums
    }, zeroColumns())

  const incomeTotal = total(income)
  const expenseTotal = total(expense)

  return {
    ok: true,
    report: {
      year,
      month,
      account,
      income,
      expense,
      incomeTotal,
      expenseTotal,
      deviation: {
        monthBudget: incomeTotal.monthBudget - expenseTotal.monthBudget,
        monthActual: incomeTotal.monthActual - expenseTotal.monthActual,
        prevMonthActual: incomeTotal.prevMonthActual - expenseTotal.prevMonthActual,
        yearBudget: incomeTotal.yearBudget - expenseTotal.yearBudget,
        yearActual: incomeTotal.yearActual - expenseTotal.yearActual,
        prevYearActual: incomeTotal.prevYearActual - expenseTotal.prevYearActual,
      },
    },
  }
}

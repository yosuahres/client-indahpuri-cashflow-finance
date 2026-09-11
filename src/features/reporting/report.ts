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
const KIND_HINT =
  "Budgets do not have a `kind` column yet. Run supabase/migrations/0004_budget_kind.sql against the project."

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
  fiscal_year_from: number
  fiscal_year_to: number
}

const zeroColumns = (): ReportColumns => ({
  monthBudget: 0,
  monthActual: 0,
  prevMonthActual: 0,
  yearBudget: 0,
  yearActual: 0,
  prevYearActual: 0,
})

/** Months a budget's fiscal range spans, so the plan can be levelled over them. */
function monthsBetween(from: string, to: string) {
  const keys: string[] = []
  const startYear = Number(from.slice(0, 4))
  const startMonth = Number(from.slice(5, 7))
  const endYear = Number(to.slice(0, 4))
  const endMonth = Number(to.slice(5, 7))
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) return keys

  const last = endYear * 12 + (endMonth - 1)
  // 600 months is far past any real plan; the guard is against a bad date.
  for (
    let index = startYear * 12 + (startMonth - 1);
    index <= last && keys.length < 600;
    index += 1
  ) {
    keys.push(monthKey(Math.floor(index / 12), (index % 12) + 1))
  }
  return keys
}

/**
 * Laporan Keuangan: every income and expense category with its plan and its
 * actuals, for the chosen month and for the year to date, each against the
 * same window a year earlier.
 */
export async function loadFinancialReport({
  year,
  month,
}: {
  year: number
  month: number
}): Promise<FinancialReportResult> {
  const empty: FinancialReport = {
    year,
    month,
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
    loadMonthlyTotals(supabase, from, to),
    supabase
      .from("budgets")
      .select("name, kind, category, amount, fiscal_year_from, fiscal_year_to")
      .lte("fiscal_year_from", year)
      .gte("fiscal_year_to", year - 1),
  ])

  if (!actuals.ok) {
    return { ok: false, error: actuals.error, report: empty }
  }

  if (budgets.error) {
    return {
      ok: false,
      error:
        budgets.error.code === UNDEFINED_COLUMN
          ? KIND_HINT
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
    // A budget with no category plans the whole line under its own name.
    const label = budget.category?.trim() || budget.name

    // The amount is the total for the whole fiscal range, so it levels out
    // over every month in it.
    const months = monthsBetween(
      `${budget.fiscal_year_from}-01-01`,
      `${budget.fiscal_year_to}-12-31`,
    )
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

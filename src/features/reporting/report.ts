import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { TransactionKind } from "@/lib/finance"

import { lastDayOfMonth, monthKey } from "./months"

const UNDEFINED_TABLE = "42P01"
const UNDEFINED_COLUMN = "42703"
const MIGRATION_HINT =
  "The transactions table does not exist yet. Run the files in supabase/migrations against the project."
const KIND_HINT =
  "Budgets do not have a `kind` column yet. Run supabase/migrations/0004_budget_kind.sql against the project."

const PAGE_SIZE = 1000

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

type TransactionRow = {
  occurred_on: string
  kind: TransactionKind
  category: string
  amount: number | string
}

type DistributionRow = { starts_on: string; ends_on: string; amount: number | string }

type BudgetRow = {
  name: string
  kind: TransactionKind
  category: string | null
  amount: number | string
  fiscal_year_from: number
  fiscal_year_to: number
  budget_distributions: DistributionRow[] | null
}

const zeroColumns = (): ReportColumns => ({
  monthBudget: 0,
  monthActual: 0,
  prevMonthActual: 0,
  yearBudget: 0,
  yearActual: 0,
  prevYearActual: 0,
})

/** Months a distribution spans, so a quarterly or yearly plan can be levelled. */
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

  const transactions: TransactionRow[] = []
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from("transactions")
      .select("occurred_on, kind, category, amount")
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on")
      .order("id")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (error) {
      return {
        ok: false,
        error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
        report: empty,
      }
    }

    transactions.push(...((data ?? []) as TransactionRow[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  const budgets = await supabase
    .from("budgets")
    .select(
      "name, kind, category, amount, fiscal_year_from, fiscal_year_to, budget_distributions(starts_on, ends_on, amount)",
    )
    .lte("fiscal_year_from", year)
    .gte("fiscal_year_to", year - 1)

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

  for (const row of transactions) {
    add(actual, row.kind, row.category, row.occurred_on.slice(0, 7), Number(row.amount) || 0)
  }

  for (const budget of (budgets.data ?? []) as BudgetRow[]) {
    // A budget with no category plans the whole line under its own name.
    const label = budget.category?.trim() || budget.name
    const rows = budget.budget_distributions ?? []

    const spans =
      rows.length > 0
        ? rows.map((row) => ({
            months: monthsBetween(row.starts_on, row.ends_on),
            amount: Number(row.amount) || 0,
          }))
        : // Not distributed: level the whole plan across its fiscal years.
          [
            {
              months: monthsBetween(
                `${budget.fiscal_year_from}-01-01`,
                `${budget.fiscal_year_to}-12-31`,
              ),
              amount: Number(budget.amount) || 0,
            },
          ]

    for (const span of spans) {
      if (span.months.length === 0) continue
      // The plan is a monthly figure, so a multi-month span levels out.
      const perMonth = span.amount / span.months.length
      for (const key of span.months) {
        add(planned, budget.kind, label, key, perMonth)
      }
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

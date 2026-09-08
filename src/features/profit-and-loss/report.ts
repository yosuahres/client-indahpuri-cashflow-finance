import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { ReportRow } from "@/components/report/types"
import { buildPeriods, type Periodicity } from "@/features/cash-flow/constants"

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "The transactions table does not exist yet. Run the files in supabase/migrations against the project."

const PAGE_SIZE = 1000

type TransactionRow = {
  occurred_on: string
  kind: "income" | "expense"
  category: string
  amount: number | string
}

export type ProfitAndLossReport = {
  periods: string[]
  rows: ReportRow[]
  totals: { income: number; expense: number; netProfit: number }
}

export type ProfitAndLossResult = {
  ok: boolean
  error?: string
  report: ProfitAndLossReport
}

/**
 * Cash-basis profit and loss: income and expense as they were actually paid,
 * since that is what the transaction log records. Accruals would need invoice
 * dates, which this app does not track.
 */
export async function loadProfitAndLossReport({
  from,
  to,
  periodicity = "Quarterly" as Periodicity,
}: {
  from: string
  to: string
  periodicity?: Periodicity
}): Promise<ProfitAndLossResult> {
  const { labels: periods, monthToIndex } = buildPeriods(from, to, periodicity)
  const empty = () => periods.map(() => 0)

  const supabase = await createClient()
  const rows: TransactionRow[] = []

  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from("transactions")
      .select("occurred_on, kind, category, amount")
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (error) {
      return {
        ok: false,
        error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
        report: emptyReport(periods),
      }
    }

    rows.push(...((data ?? []) as TransactionRow[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  // kind -> category -> per-period totals, both held as positive amounts.
  const byKind = {
    income: new Map<string, number[]>(),
    expense: new Map<string, number[]>(),
  }

  for (const row of rows) {
    const column = monthToIndex.get(row.occurred_on.slice(0, 7))
    if (column === undefined) continue

    const categories = byKind[row.kind]
    if (!categories) continue

    const totals = categories.get(row.category) ?? empty()
    totals[column] += Number(row.amount) || 0
    categories.set(row.category, totals)
  }

  const kindTotals = (kind: "income" | "expense") => {
    const totals = empty()
    for (const values of byKind[kind].values()) {
      values.forEach((value, index) => {
        totals[index] += value
      })
    }
    return totals
  }

  const income = kindTotals("income")
  const expense = kindTotals("expense")
  const netProfit = periods.map((_, index) => income[index] - expense[index])

  const reportRows: ReportRow[] = []
  for (const [kind, label] of [
    ["income", "Income"],
    ["expense", "Expense"],
  ] as const) {
    const totals = kind === "income" ? income : expense

    reportRows.push({
      id: kind,
      label,
      variant: "section",
      values: totals,
      sectionId: kind,
    })

    const categories = [...byKind[kind].entries()].sort(([a], [b]) => a.localeCompare(b))
    for (const [category, values] of categories) {
      reportRows.push({
        id: `${kind}-${category}`,
        label: category,
        variant: "item",
        values,
        sectionId: kind,
      })
    }

    reportRows.push({
      id: `${kind}-total`,
      label: `Total ${label}`,
      variant: "total",
      values: totals,
      sectionId: kind,
    })
    reportRows.push({ id: `spacer-${kind}`, label: "", variant: "spacer", values: [] })
  }

  reportRows.push({
    id: "net-profit",
    label: "Net Profit",
    variant: "grand",
    values: netProfit,
  })

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

  return {
    ok: true,
    report: {
      periods,
      rows: reportRows,
      totals: {
        income: sum(income),
        expense: sum(expense),
        netProfit: sum(netProfit),
      },
    },
  }
}

function emptyReport(periods: string[]): ProfitAndLossReport {
  const zeros = periods.map(() => 0)
  return {
    periods,
    rows: [
      { id: "income", label: "Income", variant: "section", values: zeros, sectionId: "income" },
      { id: "income-total", label: "Total Income", variant: "total", values: zeros, sectionId: "income" },
      { id: "spacer", label: "", variant: "spacer", values: [] },
      { id: "expense", label: "Expense", variant: "section", values: zeros, sectionId: "expense" },
      { id: "expense-total", label: "Total Expense", variant: "total", values: zeros, sectionId: "expense" },
      { id: "spacer-2", label: "", variant: "spacer", values: [] },
      { id: "net-profit", label: "Net Profit", variant: "grand", values: zeros },
    ],
    totals: { income: 0, expense: 0, netProfit: 0 },
  }
}

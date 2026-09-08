import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  CategorySlice,
  ChartSeries,
  TransactionDetail,
} from "@/components/report/types"
import { buildPeriods, type Periodicity } from "@/features/reports/periods"

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "The transactions table does not exist yet. Run the files in supabase/migrations against the project."

const PAGE_SIZE = 1000

/**
 * Ordinal ramps for the category pies — biggest slice darkest. Both validated
 * on the light surface: monotone lightness, gaps >= 0.06, light end over 2:1.
 * Five steps is the most either hue can carry above the contrast floor, which
 * is what caps the pie at five slices.
 */
const INCOME_RAMP = ["#0d366b", "#1c5cab", "#2a78d6", "#5598e7", "#86b6ef"] as const
const EXPENSE_RAMP = ["#611f02", "#9c390c", "#c54e1c", "#da7550", "#e89d83"] as const

/**
 * "Other" is a remainder, not a category, so it sits outside the ramp in the
 * muted furniture gray (3.59:1 on white) — otherwise it would claim the
 * lightest step while often outweighing the named slices above it.
 */
const OTHER_COLOR = "#898781"

/**
 * Category totals over the whole range, largest first, so the ramp reads
 * darkest-is-biggest. A pie stops being readable past ~6 segments: once the
 * categories outrun the ramp, the tail folds into a single "Other" slice.
 */
function buildBreakdown(
  categories: Map<string, number[]>,
  ramp: readonly string[],
): CategorySlice[] {
  const totals = [...categories.entries()]
    .map(([label, values]) => [label, values.reduce((sum, value) => sum + value, 0)] as const)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)

  // Everything fits, or the last ramp step is given up to hold "Other".
  const named = totals.length <= ramp.length ? totals : totals.slice(0, ramp.length - 1)
  const remainder = totals
    .slice(named.length)
    .reduce((sum, [, value]) => sum + value, 0)

  const entries = named.map(
    ([label, value], index) => [label, value, ramp[index]] as const,
  )
  if (remainder > 0) entries.push(["Other", remainder, OTHER_COLOR] as const)

  const total = entries.reduce((sum, [, value]) => sum + value, 0)
  return entries.map(([label, value, color]) => ({
    label,
    value,
    share: total > 0 ? value / total : 0,
    color,
  }))
}

/** Categorical slots 1-3 of the validated palette (blue / orange / aqua). */
const SERIES_COLORS = {
  income: "#2a78d6",
  expense: "#eb6834",
  netProfit: "#1baf7a",
} as const

type TransactionRow = {
  id: string
  occurred_on: string
  kind: "income" | "expense"
  category: string
  account: string
  amount: number | string
}

export type ProfitAndLossReport = {
  periods: string[]
  /** Every transaction in the range, newest first. */
  transactions: TransactionDetail[]
  series: ChartSeries[]
  /** Category split of each kind, for the pies. */
  breakdown: { income: CategorySlice[]; expense: CategorySlice[] }
  totals: { income: number; expense: number; netProfit: number }
}

/** The three plotted series of the statement, in palette order. */
function buildSeries(income: number[], expense: number[], netProfit: number[]): ChartSeries[] {
  return [
    { key: "income", label: "Income", shortLabel: "Income", color: SERIES_COLORS.income, values: income },
    { key: "expense", label: "Expense", shortLabel: "Expense", color: SERIES_COLORS.expense, values: expense },
    {
      key: "net-profit",
      label: "Net Profit",
      shortLabel: "Net Profit",
      color: SERIES_COLORS.netProfit,
      values: netProfit,
    },
  ]
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
      .select("id, occurred_on, kind, category, account, amount")
      .gte("occurred_on", from)
      .lte("occurred_on", to)
      .order("occurred_on")
      .order("id")
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

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

  // The ledger reads newest first; the query is ascending for stable paging.
  const transactions: TransactionDetail[] = rows
    .map((row) => ({
      id: row.id,
      occurredOn: row.occurred_on,
      kind: row.kind,
      category: row.category,
      account: row.account,
      amount: Number(row.amount) || 0,
    }))
    .reverse()

  return {
    ok: true,
    report: {
      periods,
      transactions,
      series: buildSeries(income, expense, netProfit),
      breakdown: {
        income: buildBreakdown(byKind.income, INCOME_RAMP),
        expense: buildBreakdown(byKind.expense, EXPENSE_RAMP),
      },
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
    transactions: [],
    series: buildSeries(zeros, zeros, zeros),
    breakdown: { income: [], expense: [] },
    totals: { income: 0, expense: 0, netProfit: 0 },
  }
}

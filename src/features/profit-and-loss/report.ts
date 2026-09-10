import "server-only"

import { createClient } from "@/lib/supabase/server"
import type {
  CategorySlice,
  ChartSeries,
  SliceTexture,
  TransactionDetail,
} from "@/components/report/types"
import { accountIssuer } from "@/features/accounts/constants"
import { buildPeriods, type Periodicity } from "@/features/reports/periods"

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "The transactions table does not exist yet. Run the files in supabase/migrations against the project."

const PAGE_SIZE = 1000

/**
 * The documented categorical order, validated as a set against the light chart
 * surface: worst adjacent CVD ΔE 9.1, worst adjacent normal-vision ΔE 19.6.
 * Neighbouring slices differ in hue rather than in lightness, which is what
 * makes them tellable apart at a glance.
 */
const CATEGORICAL = [
  "#2a78d6", // blue
  "#eb6834", // orange
  "#1baf7a", // aqua
  "#eda100", // yellow
  "#e87ba4", // magenta
  "#008300", // green
  "#4a3aa7", // violet
  "#e34948", // red
] as const

/**
 * Hue runs out at eight. Rather than fold the tail into an "Other" slice, a
 * ninth category repeats the first hue behind a 45° fill and a seventeenth its
 * 135° mirror — the documented backup channel, so no slice ever wears a hue
 * invented on the spot. Past twenty-four the texture stops changing; a pie that
 * wide has other problems.
 */
const TEXTURES: SliceTexture[] = ["solid", "diagonal", "mirror"]

/**
 * Every category with a total, largest first. Slices take the palette slots in
 * that same order, so two wedges that touch are always two slots that were
 * validated against each other.
 */
function buildBreakdown(categories: Map<string, number[]>): CategorySlice[] {
  const totals = [...categories.entries()]
    .map(([label, values]) => [label, values.reduce((sum, value) => sum + value, 0)] as const)
    .filter(([, value]) => value > 0)
    .sort(([, a], [, b]) => b - a)

  const total = totals.reduce((sum, [, value]) => sum + value, 0)

  return totals.map(([label, value], index) => ({
    label,
    value,
    share: total > 0 ? value / total : 0,
    color: CATEGORICAL[index % CATEGORICAL.length],
    texture:
      TEXTURES[Math.min(Math.floor(index / CATEGORICAL.length), TEXTURES.length - 1)],
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
  section: string
  category: string
  account: string
  amount: number | string
  party: string | null
  reference: string | null
  notes: string | null
}

type AccountRow = {
  name: string
  type: string
  provider: string | null
  holder: string | null
}

/**
 * Account name -> the bank behind it. Transactions store the account as text
 * so history survives a rename, which means the detail has to be looked up
 * instead of joined. A missing accounts table only costs the extra detail.
 */
async function loadAccountIssuers(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Map<string, string>> {
  const { data } = await supabase.from("accounts").select("name, type, provider, holder")

  const issuers = new Map<string, string>()
  for (const row of (data ?? []) as AccountRow[]) {
    const issuer = accountIssuer(row)
    if (issuer) issuers.set(row.name, issuer)
  }
  return issuers
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
      .select(
        "id, occurred_on, kind, section, category, account, amount, party, reference, notes",
      )
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

  // Fetched after the transactions rather than alongside them: two Supabase
  // calls in flight at once can both try to refresh the same access token, and
  // a Server Component cannot write the rotated cookie back.
  const accountIssuers = await loadAccountIssuers(supabase)

  // The ledger reads newest first; the query is ascending for stable paging.
  const transactions: TransactionDetail[] = rows
    .map((row) => ({
      id: row.id,
      occurredOn: row.occurred_on,
      kind: row.kind,
      section: row.section,
      category: row.category,
      account: row.account,
      accountIssuer: accountIssuers.get(row.account) ?? null,
      amount: Number(row.amount) || 0,
      party: row.party ?? "",
      reference: row.reference ?? "",
      notes: row.notes ?? "",
    }))
    .reverse()

  return {
    ok: true,
    report: {
      periods,
      transactions,
      series: buildSeries(income, expense, netProfit),
      breakdown: {
        income: buildBreakdown(byKind.income),
        expense: buildBreakdown(byKind.expense),
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

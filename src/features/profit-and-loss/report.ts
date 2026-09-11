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
import { loadMonthlyTotals, type MonthlyTotal } from "@/features/reports/aggregate"

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
  paid: boolean | null
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

/** Everything the statement carries except the ledger behind it. */
export type ProfitAndLossSummary = Omit<ProfitAndLossReport, "transactions">

export type ProfitAndLossSummaryResult = {
  ok: boolean
  error?: string
  report: ProfitAndLossSummary
}

/**
 * The plotted half of the statement: three series, two pies, three totals.
 *
 * Reads pre-grouped monthly totals rather than the ledger, so what crosses the
 * network is a few dozen rows however many transactions stand behind them. The
 * dashboard shows only these figures, and this is all it asks for.
 */
export async function loadProfitAndLossSummary({
  from,
  to,
  periodicity = "Quarterly" as Periodicity,
}: {
  from: string
  to: string
  periodicity?: Periodicity
}): Promise<ProfitAndLossSummaryResult> {
  const { labels: periods, monthToIndex } = buildPeriods(from, to, periodicity)

  const supabase = await createClient()
  const totals = await loadMonthlyTotals(supabase, from, to)

  if (!totals.ok) {
    return { ok: false, error: totals.error, report: summarize([], periods, monthToIndex) }
  }

  return { ok: true, report: summarize(totals.rows, periods, monthToIndex) }
}

/** Folds monthly category totals into the periods the filters asked for. */
function summarize(
  rows: MonthlyTotal[],
  periods: string[],
  monthToIndex: Map<string, number>,
): ProfitAndLossSummary {
  const empty = () => periods.map(() => 0)

  // kind -> category -> per-period totals, both held as positive amounts.
  const byKind = {
    income: new Map<string, number[]>(),
    expense: new Map<string, number[]>(),
  }

  for (const row of rows) {
    const column = monthToIndex.get(row.month)
    if (column === undefined) continue

    const categories = byKind[row.kind]
    if (!categories) continue

    const values = categories.get(row.category) ?? empty()
    values[column] += row.total
    categories.set(row.category, values)
  }

  const kindTotals = (kind: "income" | "expense") => {
    const values = empty()
    for (const perCategory of byKind[kind].values()) {
      perCategory.forEach((value, index) => {
        values[index] += value
      })
    }
    return values
  }

  const income = kindTotals("income")
  const expense = kindTotals("expense")
  const netProfit = periods.map((_, index) => income[index] - expense[index])
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

  return {
    periods,
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
  }
}

/**
 * Cash-basis profit and loss: income and expense as they were actually paid,
 * since that is what the transaction log records. Accruals would need invoice
 * dates, which this app does not track.
 *
 * The ledger comes back with it, so this is the heavier of the two loaders.
 * Anything that only plots figures should call `loadProfitAndLossSummary`.
 */
export async function loadProfitAndLossReport({
  from,
  to,
  periodicity = "Quarterly" as Periodicity,
  kind = "all",
}: {
  from: string
  to: string
  periodicity?: Periodicity
  /** Narrows the ledger to one direction; "all" leaves it unfiltered. */
  kind?: "all" | "income" | "expense"
}): Promise<ProfitAndLossResult> {
  const { labels: periods, monthToIndex } = buildPeriods(from, to, periodicity)

  const supabase = await createClient()

  // Started before the transactions rather than after them. Both read through
  // the one request-scoped client, which serializes its own token refresh, so
  // the account lookup costs no round trip of its own — it overlaps the pages.
  const issuers = loadAccountIssuers(supabase)

  const rows: TransactionRow[] = []

  for (let page = 0; ; page += 1) {
    // Narrowed in the database rather than after the fact, so a filtered view
    // pages through only the rows it will show.
    let query = supabase
      .from("transactions")
      .select(
        "id, occurred_on, kind, section, category, account, amount, paid, party, reference, notes",
      )
      .gte("occurred_on", from)
      .lte("occurred_on", to)

    if (kind !== "all") query = query.eq("kind", kind)

    const { data, error } = await query
      .order("occurred_on")
      .order("id")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (error) {
      // Nothing awaits `issuers` on this path; settle it so a rejection cannot
      // surface later as an unhandled promise.
      void issuers.catch(() => undefined)
      return {
        ok: false,
        error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
        report: emptyReport(periods),
      }
    }

    rows.push(...((data ?? []) as TransactionRow[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  // The ledger is already here, so the figures are folded from it rather than
  // asked for a second time.
  const monthly = new Map<string, MonthlyTotal>()
  for (const row of rows) {
    const month = row.occurred_on.slice(0, 7)
    const key = `${row.kind} ${row.category} ${month}`
    const entry = monthly.get(key)
    if (entry) entry.total += Number(row.amount) || 0
    else
      monthly.set(key, {
        kind: row.kind,
        category: row.category,
        month,
        total: Number(row.amount) || 0,
      })
  }

  const summary = summarize([...monthly.values()], periods, monthToIndex)
  const accountIssuers = await issuers

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
      paid: row.paid ?? null,
      party: row.party ?? "",
      reference: row.reference ?? "",
      notes: row.notes ?? "",
    }))
    .reverse()

  return { ok: true, report: { ...summary, transactions } }
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

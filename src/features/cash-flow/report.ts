import "server-only"

import { SECTIONS, type SectionValue } from "@/lib/finance"
import { createClient } from "@/lib/supabase/server"

import { SECTION_COLORS, buildPeriods, type Periodicity } from "./constants"
import type { CashFlowReport, ReportRow } from "./types"

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "The transactions table does not exist yet. Run the files in supabase/migrations against the project."

/** PostgREST caps a single response, so read through it in pages. */
const PAGE_SIZE = 1000

type TransactionRow = {
  occurred_on: string
  kind: "income" | "expense"
  section: SectionValue
  category: string
  amount: number | string
}

/** Income adds to cash, expense takes from it. Amounts are stored unsigned. */
function signed(row: { kind: string; amount: number | string }) {
  const value = Number(row.amount) || 0
  return row.kind === "income" ? value : -value
}

export type CashFlowResult = {
  ok: boolean
  error?: string
  report: CashFlowReport
}

export async function loadCashFlowReport({
  company = "indahpuri",
  from,
  to,
  periodicity = "Quarterly" as Periodicity,
}: {
  company?: string
  /** Inclusive ISO dates. Fiscal-year mode passes Jan 1 to Dec 31. */
  from: string
  to: string
  periodicity?: Periodicity
}): Promise<CashFlowResult> {
  const { labels: periods, monthToIndex } = buildPeriods(from, to, periodicity)
  const empty = () => periods.map(() => 0)

  const supabase = await createClient()
  const start = from
  const end = to

  // Everything before the year opens the balance.
  const opening = await supabase
    .from("transactions")
    .select("kind, amount")
    .lt("occurred_on", start)

  if (opening.error) {
    return {
      ok: false,
      error: opening.error.code === UNDEFINED_TABLE ? MIGRATION_HINT : opening.error.message,
      report: emptyReport(company, periods),
    }
  }

  const rows: TransactionRow[] = []
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from("transactions")
      .select("occurred_on, kind, section, category, amount")
      .gte("occurred_on", start)
      .lte("occurred_on", end)
      .order("occurred_on")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (error) {
      return {
        ok: false,
        error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
        report: emptyReport(company, periods),
      }
    }

    rows.push(...((data ?? []) as TransactionRow[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  // section -> category -> per-period totals
  const bySection = new Map<SectionValue, Map<string, number[]>>()
  for (const section of SECTIONS) bySection.set(section.value, new Map())

  for (const row of rows) {
    // occurred_on is `YYYY-MM-DD`, so its first seven characters key the column.
    const column = monthToIndex.get(row.occurred_on.slice(0, 7))
    const categories = bySection.get(row.section)
    if (column === undefined || !categories) continue

    const totals = categories.get(row.category) ?? empty()
    totals[column] += signed(row)
    categories.set(row.category, totals)
  }

  const sectionTotals = (section: SectionValue) => {
    const totals = empty()
    for (const values of bySection.get(section)!.values()) {
      values.forEach((value, index) => {
        totals[index] += value
      })
    }
    return totals
  }

  const operations = sectionTotals("operations")
  const investing = sectionTotals("investing")
  const financing = sectionTotals("financing")

  const netChange = periods.map(
    (_, index) => operations[index] + investing[index] + financing[index],
  )

  const cashAtStart: number[] = []
  const cashAtEnd: number[] = []
  let running = (opening.data ?? []).reduce((sum, row) => sum + signed(row), 0)
  for (const change of netChange) {
    cashAtStart.push(running)
    running += change
    cashAtEnd.push(running)
  }

  const totalsFor = (section: SectionValue) =>
    section === "operations" ? operations : section === "investing" ? investing : financing

  const reportRows: ReportRow[] = []
  for (const section of SECTIONS) {
    const totals = totalsFor(section.value)
    reportRows.push({
      id: section.value,
      label: `Cash Flow from ${section.label}`,
      variant: "section",
      values: totals,
      sectionId: section.value,
    })

    // Line items are whatever categories were actually used this year.
    const categories = [...bySection.get(section.value)!.entries()].sort(
      ([a], [b]) => a.localeCompare(b),
    )
    for (const [category, values] of categories) {
      reportRows.push({
        id: `${section.value}-${category}`,
        label: category,
        variant: "item",
        values,
        sectionId: section.value,
      })
    }

    reportRows.push({
      id: `${section.value}-total`,
      label: `Net Cash from ${section.label}`,
      variant: "total",
      values: totals,
      sectionId: section.value,
    })
    reportRows.push({ id: `spacer-${section.value}`, label: "", variant: "spacer", values: [] })
  }

  reportRows.push(
    { id: "net-change", label: "Net Change in Cash", variant: "grand", values: netChange },
    {
      id: "cash-start",
      label: "Cash and Cash Equivalents at Beginning of Period",
      variant: "item",
      values: cashAtStart,
    },
    {
      id: "cash-end",
      label: "Cash and Cash Equivalents at End of Period",
      variant: "grand",
      values: cashAtEnd,
    },
  )

  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

  return {
    ok: true,
    report: {
      company,
      periods,
      rows: reportRows,
      series: SECTIONS.map((section) => ({
        key: section.value,
        label: `Cash Flow from ${section.label}`,
        shortLabel: section.label,
        color: SECTION_COLORS[section.value],
        values: totalsFor(section.value),
      })),
      totals: {
        operations: sum(operations),
        investing: sum(investing),
        financing: sum(financing),
        netChange: sum(netChange),
      },
    },
  }
}

/** Zeroed report, so the page still renders when the query fails. */
function emptyReport(company: string, periods: string[]): CashFlowReport {
  const zeros = periods.map(() => 0)
  return {
    company,
    periods,
    rows: SECTIONS.flatMap((section) => [
      {
        id: section.value,
        label: `Cash Flow from ${section.label}`,
        variant: "section" as const,
        values: zeros,
        sectionId: section.value,
      },
      {
        id: `${section.value}-total`,
        label: `Net Cash from ${section.label}`,
        variant: "total" as const,
        values: zeros,
        sectionId: section.value,
      },
    ]),
    series: SECTIONS.map((section) => ({
      key: section.value,
      label: `Cash Flow from ${section.label}`,
      shortLabel: section.label,
      color: SECTION_COLORS[section.value],
      values: zeros,
    })),
    totals: { operations: 0, investing: 0, financing: 0, netChange: 0 },
  }
}

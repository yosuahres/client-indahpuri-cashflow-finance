import "server-only"

import type { createClient } from "@/lib/supabase/server"
import type { TransactionKind } from "@/lib/finance"

/** Postgres "relation does not exist" — the migration has not been run. */
export const UNDEFINED_TABLE = "42P01"
/** Postgres "function does not exist", and PostgREST's own name for it. */
const UNDEFINED_FUNCTION = "42883"
const PGRST_NO_FUNCTION = "PGRST202"
/** Postgres "column does not exist". */
const UNDEFINED_COLUMN = "42703"

const PAID_HINT =
  "The transactions table has no `paid` column yet. Run " +
  "supabase/migrations/0008_expense_paid.sql and 0009_paid_only_totals.sql " +
  "against the project."

export const MIGRATION_HINT =
  "The transactions table does not exist yet. Run the files in supabase/migrations against the project."

const PAGE_SIZE = 1000

/** One category's takings in one month, on one side of the ledger. */
export type MonthlyTotal = {
  kind: TransactionKind
  category: string
  /** `YYYY-MM`. */
  month: string
  total: number
}

export type MonthlyTotalsResult = {
  ok: boolean
  error?: string
  rows: MonthlyTotal[]
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

/**
 * Every report groups transactions the same way — by direction, by category,
 * by month — so the grouping happens once, in the database.
 *
 * This used to be done in JavaScript, which meant every row in the window
 * crossed the network to be added up and thrown away: a year of entries to
 * draw a chart with twelve points. Now the wire carries one row per category
 * per month, a few dozen either way, however much history sits behind them.
 */
export async function loadMonthlyTotals(
  supabase: SupabaseClient,
  from: string,
  to: string,
  /**
   * Leaves unpaid expenses out. A bill on the books is not cash that moved, so
   * the statements that report actuals ask for this; the plots, which show the
   * whole picture, do not.
   */
  paidOnly = false,
  /** One account's movements only. Undefined reads every account. */
  account?: string,
): Promise<MonthlyTotalsResult> {
  const { data, error } = await supabase.rpc("report_monthly_totals", {
    from_date: from,
    to_date: to,
    paid_only: paidOnly,
    account_name: account ?? null,
  })

  if (!error) {
    return {
      ok: true,
      rows: ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        kind: row.kind as TransactionKind,
        category: row.category as string,
        month: row.month as string,
        total: Number(row.total) || 0,
      })),
    }
  }

  // Deploying the app and running the migration are two separate acts, and
  // either can land first. Until 0006 has been run there is no function to
  // call, so the old row-by-row path still answers — slower, but not broken.
  if (error.code === UNDEFINED_FUNCTION || error.code === PGRST_NO_FUNCTION) {
    return aggregateInProcess(supabase, from, to, paidOnly, account)
  }

  return {
    ok: false,
    error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
    rows: [],
  }
}

type AggregateRow = {
  occurred_on: string
  kind: TransactionKind
  category: string
  amount: number | string
  /** Only selected when the caller is excluding unpaid expenses. */
  paid?: boolean | null
}

/** The pre-0006 path: read every row in the window and group them here. */
async function aggregateInProcess(
  supabase: SupabaseClient,
  from: string,
  to: string,
  paidOnly: boolean,
  account?: string,
): Promise<MonthlyTotalsResult> {
  const totals = new Map<string, MonthlyTotal>()

  for (let page = 0; ; page += 1) {
    let query = supabase
      .from("transactions")
      // Branching the column list costs the literal type supabase-js infers
      // from it, so the rows are named below instead.
      .select(
        paidOnly
          ? "occurred_on, kind, category, amount, paid"
          : "occurred_on, kind, category, amount",
      )
      .gte("occurred_on", from)
      .lte("occurred_on", to)

    // Same narrowing the function applies, for a database that predates it.
    if (account) query = query.eq("account", account)

    const { data, error } = await query
      .order("occurred_on")
      .order("id")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (error) {
      return {
        ok: false,
        error:
          error.code === UNDEFINED_TABLE
            ? MIGRATION_HINT
            : error.code === UNDEFINED_COLUMN
              ? PAID_HINT
              : error.message,
        rows: [],
      }
    }

    for (const row of (data ?? []) as unknown as AggregateRow[]) {
      // Same exclusion the function applies, for a database that predates it.
      if (paidOnly && row.paid === false) continue

      const kind = row.kind
      const category = row.category
      const month = row.occurred_on.slice(0, 7)
      const key = `${kind} ${category} ${month}`

      const entry = totals.get(key)
      if (entry) entry.total += Number(row.amount) || 0
      else totals.set(key, { kind, category, month, total: Number(row.amount) || 0 })
    }

    if (!data || data.length < PAGE_SIZE) break
  }

  return { ok: true, rows: [...totals.values()] }
}

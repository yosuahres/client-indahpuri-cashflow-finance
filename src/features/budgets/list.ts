import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SectionValue, TransactionKind } from "@/lib/finance"

/** Postgres "relation does not exist" — the migration has not been run. */
const UNDEFINED_TABLE = "42P01"
/** Postgres "column does not exist". */
const UNDEFINED_COLUMN = "42703"

const MIGRATION_HINT =
  "The budgets table does not exist yet. Run the files in supabase/migrations against the project."
const PERIOD_HINT =
  "The budgets table has no period columns yet. Run " +
  "supabase/migrations/0010_budget_period.sql against the project."

/** One budget as the Anggaran list shows it. */
export type BudgetEntry = {
  id: string
  name: string
  kind: TransactionKind
  section: SectionValue
  category: string | null
  costCenter: string | null
  /** Null on plans entered before budgets named one — they count everywhere. */
  account: string | null
  amount: number
  year: number
  /** 1-12, or null when the plan covers the whole year. */
  month: number | null
  warnOnOverrun: boolean
}

export type BudgetListResult = {
  ok: boolean
  error?: string
  entries: BudgetEntry[]
}

type Row = {
  id: string
  name: string
  kind: TransactionKind
  section: SectionValue
  category: string | null
  cost_center: string | null
  account: string | null
  amount: number | string
  period_year: number
  period_month: number | null
  warn_on_overrun: boolean
}

/**
 * Every budget filed against one year — the yearly plans and each month's.
 *
 * Both views the list offers are cuts of this one set, so it is fetched whole
 * and sliced in the page: a year of plans is a handful of rows, and asking
 * twice would cost more than carrying them.
 */
export async function listBudgets(year: number): Promise<BudgetListResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("budgets")
    .select(
      "id, name, kind, section, category, cost_center, account, amount, period_year, period_month, warn_on_overrun",
    )
    .eq("period_year", year)
    // Yearly plans lead, then the months in order: the same order the page
    // reads them in, so nothing has to be sorted again.
    .order("period_month", { ascending: true, nullsFirst: true })
    .order("kind")
    .order("name")

  if (error) {
    return {
      ok: false,
      error:
        error.code === UNDEFINED_TABLE
          ? MIGRATION_HINT
          : error.code === UNDEFINED_COLUMN
            ? PERIOD_HINT
            : error.message,
      entries: [],
    }
  }

  return {
    ok: true,
    entries: ((data ?? []) as Row[]).map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      section: row.section,
      category: row.category,
      costCenter: row.cost_center,
      account: row.account,
      amount: Number(row.amount) || 0,
      year: row.period_year,
      month: row.period_month,
      warnOnOverrun: row.warn_on_overrun,
    })),
  }
}

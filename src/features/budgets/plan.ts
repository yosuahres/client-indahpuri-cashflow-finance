import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { SectionValue, TransactionKind } from "@/lib/finance"

/** Postgres "relation does not exist" — the migration has not been run. */
const UNDEFINED_TABLE = "42P01"
/** Postgres "column does not exist". */
const UNDEFINED_COLUMN = "42703"

const MIGRATION_HINT =
  "The budgets table does not exist yet. Run the files in supabase/migrations against the project."
export const ACCOUNT_HINT =
  "The budgets table has no period or account columns yet. Run " +
  "supabase/migrations/0010_budget_period.sql and 0011_budget_account.sql " +
  "against the project."

/**
 * One line of a plan: a category, and what is planned against it in each
 * month. A yearly plan files its single figure under month 0, which is not a
 * month — it is the slot the grid's one column reads.
 */
export type PlanRow = {
  category: string
  section: SectionValue
  /** Month (1-12), or 0 for a yearly plan, to the amount planned. */
  amounts: Record<number, number>
}

export type PlanSlice = {
  account: string
  year: number
  kind: TransactionKind
  monthly: boolean
}

export type PlanResult = {
  ok: boolean
  error?: string
  rows: PlanRow[]
  /** Carried back onto the form so a re-save keeps them. */
  costCenter: string
  warnOnOverrun: boolean
}

const blank = (): Omit<PlanResult, "ok" | "error"> => ({
  rows: [],
  costCenter: "",
  warnOnOverrun: true,
})

/** A section is a fixed enum value, so it can never contain the separator. */
const lineKey = (section: string, category: string) => `${section}|${category}`

/**
 * What is already planned for one account, year, direction and cadence —
 * the slice the entry grid edits.
 *
 * The grid is an editor rather than an append-only form, so it has to open on
 * what is already there: saving replaces this exact slice, and a row the grid
 * never showed would be deleted without anyone seeing it go.
 */
export async function loadBudgetPlan(slice: PlanSlice): Promise<PlanResult> {
  if (!slice.account) return { ok: true, ...blank() }

  const supabase = await createClient()

  let query = supabase
    .from("budgets")
    .select("category, name, section, amount, period_month, cost_center, warn_on_overrun")
    .eq("period_year", slice.year)
    .eq("kind", slice.kind)
    .eq("account", slice.account)

  // A monthly grid never shows the yearly plans, and the other way about.
  query = slice.monthly
    ? query.not("period_month", "is", null)
    : query.is("period_month", null)

  const { data, error } = await query.order("period_month")

  if (error) {
    return {
      ok: false,
      error:
        error.code === UNDEFINED_TABLE
          ? MIGRATION_HINT
          : error.code === UNDEFINED_COLUMN
            ? ACCOUNT_HINT
            : error.message,
      ...blank(),
    }
  }

  type Row = {
    category: string | null
    name: string
    section: SectionValue
    amount: number | string
    period_month: number | null
    cost_center: string | null
    warn_on_overrun: boolean
  }

  const rows = new Map<string, PlanRow>()
  let costCenter = ""
  // Off only if every row filed under this slice has it off.
  let warnOnOverrun: boolean | null = null

  for (const row of (data ?? []) as Row[]) {
    // Plans entered before the grid could cover a whole section under their
    // own name; that is the closest thing to a category they carry.
    const category = row.category?.trim() || row.name
    const key = lineKey(row.section, category)

    const entry = rows.get(key) ?? { category, section: row.section, amounts: {} }
    const slot = row.period_month ?? 0
    entry.amounts[slot] = (entry.amounts[slot] ?? 0) + (Number(row.amount) || 0)
    rows.set(key, entry)

    if (!costCenter && row.cost_center?.trim()) costCenter = row.cost_center.trim()
    warnOnOverrun =
      warnOnOverrun === null ? row.warn_on_overrun : warnOnOverrun && row.warn_on_overrun
  }

  return {
    ok: true,
    rows: [...rows.values()].sort((a, b) => a.category.localeCompare(b.category, "id-ID")),
    costCenter,
    warnOnOverrun: warnOnOverrun ?? true,
  }
}

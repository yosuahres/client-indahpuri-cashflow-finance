"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import type { SectionValue, TransactionKind } from "@/lib/finance"
import { readBudgetPlan, validateBudgetPlan } from "./validation"

const UNDEFINED_TABLE = "42P01"
const UNDEFINED_COLUMN = "42703"

const TABLE_HINT =
  "The budgets table does not exist yet. Run supabase/migrations/0001_cash_flow.sql against the project first."
const COLUMN_HINT =
  "The budgets table has no period or account columns yet. Run " +
  "supabase/migrations/0010_budget_period.sql and 0011_budget_account.sql against the project first."

const hint = (code?: string) =>
  code === UNDEFINED_TABLE ? TABLE_HINT : code === UNDEFINED_COLUMN ? COLUMN_HINT : undefined

/**
 * Saves a whole grid at once: one account's plans, for one year, on one side
 * of the ledger, at one cadence.
 *
 * The grid opened on what was already there, so this replaces that same slice
 * rather than adding to it — clearing a cell is how a plan is removed, and an
 * insert-only save would leave the old figure standing beside the new one.
 * The delete and the insert are two statements; between them the slice is
 * briefly empty, which is a report reading low for a moment rather than
 * figures that are wrong.
 */
export async function saveBudgetPlan(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = readBudgetPlan(formData)
  const { errors, filled, monthly, year } = validateBudgetPlan(input)
  if (hasFieldErrors(errors)) return { fieldErrors: errors }

  const supabase = await createClient()
  const user = await requireUser()

  const kind = input.kind as TransactionKind

  // Everything filed under this slice goes, whether the grid still shows it or
  // not. RLS scopes it to this user; the explicit user_id is belt and braces.
  let wipe = supabase
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("period_year", year)
    .eq("kind", kind)
    .eq("account", input.account)

  wipe = monthly ? wipe.not("period_month", "is", null) : wipe.is("period_month", null)

  const { error: wipeError } = await wipe
  if (wipeError) {
    return { error: hint(wipeError.code) ?? wipeError.message }
  }

  const rows = input.lines.flatMap((line) =>
    Object.entries(line.amounts)
      .map(([slot, value]) => ({ slot: Number(slot), amount: Number(value) }))
      .filter(({ amount }) => Number.isFinite(amount) && amount > 0)
      .map(({ slot, amount }) => ({
        user_id: user.id,
        // Nothing reads the name once a category is set; it is the report's
        // fallback label, so it carries the category rather than a blank.
        name: line.category,
        kind,
        section: line.section as SectionValue,
        category: line.category,
        cost_center: input.costCenter || null,
        account: input.account,
        period_year: year,
        // Slot 0 is the yearly plan, which files under no month at all.
        period_month: slot === 0 ? null : slot,
        amount,
        warn_on_overrun: formData.get("warnOnOverrun") === "on",
      })),
  )

  if (rows.length > 0) {
    const { error } = await supabase.from("budgets").insert(rows)
    if (error) {
      return { error: hint(error.code) ?? error.message }
    }
  }

  refresh()

  // If the grid was emptied there is nothing to go and look at, so the form
  // stays put and says so rather than sending you to a blank list.
  if (filled === 0) {
    return { message: "Plan cleared — every figure for this account and period is gone.", savedAt: Date.now() }
  }

  redirect(`/budgets?period=${input.period}&year=${year}&month=1&account=${encodeURIComponent(input.account)}`)
}

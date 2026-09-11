"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import {
  readTransaction,
  validateTransaction,
  type TransactionInput,
} from "./validation"

/** Postgres code for "relation does not exist" — the migration has not been run. */
const UNDEFINED_TABLE = "42P01"

/** Postgres code for "column does not exist". */
const UNDEFINED_COLUMN = "42703"

const PAID_HINT =
  "The transactions table has no `paid` column yet. Run " +
  "supabase/migrations/0008_expense_paid.sql against the project first."

/**
 * The column is expense-only, and a check constraint enforces that, so income
 * clears it rather than carrying a value that would not mean anything.
 */
function paidColumn(input: TransactionInput) {
  return input.kind === "expense" ? input.paid === "paid" : null
}

export async function createTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const addAnother = formData.get("addAnother") === "on"
  const input = readTransaction(formData)
  const fieldErrors = validateTransaction(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const user = await requireUser()

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    occurred_on: input.occurredOn,
    kind: input.kind,
    section: input.section,
    category: input.category,
    account: input.account,
    party: input.party || null,
    reference: input.reference || null,
    amount: Number(input.amount),
    notes: input.notes || null,
    paid: paidColumn(input),
  })

  if (error) {
    if (error.code === UNDEFINED_TABLE) {
      return {
        error:
          "The transactions table does not exist yet. Run supabase/migrations/0001_cash_flow.sql against the project first.",
      }
    }
    if (error.code === UNDEFINED_COLUMN) return { error: PAID_HINT }
    return { error: error.message }
  }

  refresh()

  // Entering a stack of receipts: stay put and clear the fields instead.
  if (addAnother) {
    return { message: "Transaction saved.", savedAt: Date.now() }
  }

  redirect("/dashboard")
}

/**
 * Saves an edit made in the detail panel. Row level security scopes the update
 * to the signed-in user, so an id that is not theirs matches nothing and comes
 * back as "no longer exists" rather than silently succeeding.
 */
export async function updateTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) return { error: "That transaction is no longer open." }

  const input = readTransaction(formData)
  const fieldErrors = validateTransaction(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .update({
      occurred_on: input.occurredOn,
      kind: input.kind,
      section: input.section,
      category: input.category,
      account: input.account,
      party: input.party || null,
      reference: input.reference || null,
      amount: Number(input.amount),
      notes: input.notes || null,
      paid: paidColumn(input),
    })
    .eq("id", id)
    .select("id")

  if (error) {
    if (error.code === UNDEFINED_TABLE) return { error: "The transactions table is missing." }
    if (error.code === UNDEFINED_COLUMN) return { error: PAID_HINT }
    return { error: error.message }
  }
  if (!data || data.length === 0) {
    return { error: "That transaction no longer exists — it may have been deleted." }
  }

  refresh()
  return { message: "Changes saved.", savedAt: Date.now() }
}

export type PaidResult = { ok: boolean; error?: string }

/**
 * Flips one expense between paid and unpaid straight from the ledger, without
 * opening the row. The `kind` guard keeps income out: a check constraint holds
 * `paid` to expenses, so an income row would be rejected by the database
 * anyway — matching nothing here gives a clearer answer than that would.
 *
 * Row level security scopes the update to the signed-in user.
 */
export async function setTransactionPaid(id: string, paid: boolean): Promise<PaidResult> {
  if (!id) return { ok: false, error: "That transaction is no longer open." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .update({ paid })
    .eq("id", id)
    .eq("kind", "expense")
    .select("id")

  if (error) {
    if (error.code === UNDEFINED_TABLE) return { ok: false, error: "The transactions table is missing." }
    if (error.code === UNDEFINED_COLUMN) return { ok: false, error: PAID_HINT }
    return { ok: false, error: error.message }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That transaction no longer exists, or is not an expense." }
  }

  refresh()
  return { ok: true }
}

export type DeleteResult = { ok: boolean; error?: string; deleted: number }

/**
 * Removes recorded transactions outright — the ledger keeps no tombstone, so
 * the caller is expected to have confirmed first. Row level security scopes the
 * delete to the signed-in user, so an id belonging to someone else is a no-op
 * rather than an error.
 */
export async function deleteTransactions(ids: string[]): Promise<DeleteResult> {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))]
  if (unique.length === 0) return { ok: false, error: "Nothing selected.", deleted: 0 }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("transactions")
    .delete()
    .in("id", unique)
    // Returning the rows is what makes the count real rather than assumed.
    .select("id")

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? "The transactions table is missing." : error.message,
      deleted: 0,
    }
  }

  refresh()
  return { ok: true, deleted: data?.length ?? 0 }
}

"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission, requireUser } from "@/features/auth/session"
import { editableKinds, entryKinds } from "@/features/auth/permissions"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { flash } from "@/lib/flash"
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

function paidColumn(input: TransactionInput) {
  return input.paid === "paid"
}

export async function createTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const addAnother = formData.get("addAnother") === "on"
  const input = readTransaction(formData)
  const fieldErrors = validateTransaction(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const user = await requireUser()
  // Row level security refuses the same insert (0024); asking first gives a
  // sentence instead of a policy violation.
  const kinds = entryKinds(user.permissions)
  if (!kinds.some((kind) => kind === input.kind)) {
    return kinds.length === 0
      ? { error: "You do not have permission to enter transactions." }
      : { fieldErrors: { kind: `You do not have permission to enter ${input.kind}.` } }
  }

  const supabase = await createClient()

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

  await flash("success", "Transaction saved.")
  redirect("/dashboard")
}

const NOT_YOURS = "You may only change transactions of a kind you can enter."

/**
 * The kinds the caller may change, and the rows they are about to change. A
 * row of the other kind is not theirs to touch, whichever way the edit goes.
 */
async function allowedKinds() {
  const user = await requirePermission("transactions.edit")
  return editableKinds(user.permissions)
}

/**
 * Saves an edit made in the detail panel. Row level security lets only managers
 * change a row, so for anyone else the id matches nothing and comes back as
 * "no longer exists" rather than silently succeeding.
 */
export async function updateTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) return { error: "That transaction is no longer open." }
  const kinds = await allowedKinds()

  const input = readTransaction(formData)
  const fieldErrors = validateTransaction(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()

  // Both ends of the edit: the row as it stands, and what it would become.
  const { data: current } = await supabase
    .from("transactions")
    .select("kind")
    .eq("id", id)
    .maybeSingle()
  if (!current) {
    return { error: "That transaction no longer exists — it may have been deleted." }
  }
  if (!kinds.some((kind) => kind === current.kind) ||
    !kinds.some((kind) => kind === input.kind)) {
    return { error: NOT_YOURS }
  }

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
 * Flips one transaction between settled and unsettled straight from the ledger.
 */
export async function setTransactionPaid(id: string, paid: boolean): Promise<PaidResult> {
  if (!id) return { ok: false, error: "That transaction is no longer open." }
  const kinds = await allowedKinds()

  const supabase = await createClient()

  const { data: current } = await supabase
    .from("transactions")
    .select("kind")
    .eq("id", id)
    .maybeSingle()
  if (!current) return { ok: false, error: "That transaction no longer exists." }
  if (!kinds.some((kind) => kind === current.kind)) return { ok: false, error: NOT_YOURS }
  const { data, error } = await supabase
    .from("transactions")
    .update({ paid })
    .eq("id", id)
    .select("id")

  if (error) {
    if (error.code === UNDEFINED_TABLE) return { ok: false, error: "The transactions table is missing." }
    if (error.code === UNDEFINED_COLUMN) return { ok: false, error: PAID_HINT }
    return { ok: false, error: error.message }
  }
  if (!data || data.length === 0) {
    return { ok: false, error: "That transaction no longer exists." }
  }

  refresh()
  return { ok: true }
}

export type DeleteResult = { ok: boolean; error?: string; deleted: number }

/**
 * Removes recorded transactions outright — the ledger keeps no tombstone, so
 * the caller is expected to have confirmed first. Row level security lets only
 * managers delete, so for anyone else it is a no-op rather than an error.
 */
export async function deleteTransactions(ids: string[]): Promise<DeleteResult> {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))]
  if (unique.length === 0) return { ok: false, error: "Nothing selected.", deleted: 0 }
  const kinds = await allowedKinds()

  const supabase = await createClient()

  // All or nothing: a selection reaching across kinds is a mistake, not a
  // request to delete half of it.
  const { data: rows } = await supabase.from("transactions").select("kind").in("id", unique)
  if (rows?.some((row) => !kinds.some((kind) => kind === row.kind))) {
    return { ok: false, error: NOT_YOURS, deleted: 0 }
  }
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

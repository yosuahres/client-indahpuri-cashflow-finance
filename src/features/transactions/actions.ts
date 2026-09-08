"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { readTransaction, validateTransaction } from "./validation"

/** Postgres code for "relation does not exist" — the migration has not been run. */
const UNDEFINED_TABLE = "42P01"

export async function createTransaction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const addAnother = formData.get("addAnother") === "on"
  const input = readTransaction(formData)
  const fieldErrors = validateTransaction(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

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
  })

  if (error) {
    if (error.code === UNDEFINED_TABLE) {
      return {
        error:
          "The transactions table does not exist yet. Run supabase/migrations/0001_cash_flow.sql against the project first.",
      }
    }
    return { error: error.message }
  }

  refresh()

  // Entering a stack of receipts: stay put and clear the fields instead.
  if (addAnother) {
    return { message: "Transaction saved.", savedAt: Date.now() }
  }

  redirect("/cash-flow")
}

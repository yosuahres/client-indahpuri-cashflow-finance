"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { readBudget, validateBudget } from "./validation"

const UNDEFINED_TABLE = "42P01"
const UNDEFINED_COLUMN = "42703"

export async function createBudget(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = readBudget(formData)
  const fieldErrors = validateBudget(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const user = await requireUser()

  const { error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      name: input.name,
      kind: input.kind,
      section: input.section,
      category: input.category || null,
      cost_center: input.costCenter || null,
      period_year: Number(input.periodYear),
      // Null is what marks a plan as covering the whole year.
      period_month: input.period === "monthly" ? Number(input.periodMonth) : null,
      amount: Number(input.amount),
      warn_on_overrun: formData.get("warnOnOverrun") === "on",
    })

  if (error) {
    if (error.code === UNDEFINED_TABLE) {
      return {
        error:
          "The budgets table does not exist yet. Run supabase/migrations/0001_cash_flow.sql against the project first.",
      }
    }
    if (error.code === UNDEFINED_COLUMN) {
      return {
        error:
          "The budgets table has no period columns yet. Run supabase/migrations/0010_budget_period.sql against the project first.",
      }
    }
    return { error: error.message }
  }

  refresh()
  redirect("/dashboard")
}

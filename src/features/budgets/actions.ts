"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import type { Frequency } from "@/lib/finance"
import { buildDistribution } from "./distribution"
import { readBudget, validateBudget } from "./validation"

const UNDEFINED_TABLE = "42P01"

export async function createBudget(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = readBudget(formData)
  const fieldErrors = validateBudget(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const distributeEqually = formData.get("distributeEqually") === "on"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: budget, error } = await supabase
    .from("budgets")
    .insert({
      user_id: user.id,
      name: input.name,
      kind: input.kind,
      section: input.section,
      category: input.category || null,
      cost_center: input.costCenter || null,
      fiscal_year_from: Number(input.fromYear),
      fiscal_year_to: Number(input.toYear),
      frequency: input.frequency,
      amount: Number(input.amount),
      distribute_equally: distributeEqually,
      warn_on_overrun: formData.get("warnOnOverrun") === "on",
    })
    .select("id")
    .single()

  if (error) {
    if (error.code === UNDEFINED_TABLE) {
      return {
        error:
          "The budgets table does not exist yet. Run supabase/migrations/0001_cash_flow.sql against the project first.",
      }
    }
    return { error: error.message }
  }

  // The period rows are derived, so the server recomputes them rather than
  // trusting whatever the browser rendered.
  if (distributeEqually) {
    const rows = buildDistribution(
      Number(input.fromYear),
      Number(input.toYear),
      input.frequency as Frequency,
      Number(input.amount),
    ).map((row, index) => ({
      budget_id: budget.id,
      starts_on: row.startDate,
      ends_on: row.endDate,
      amount: row.amount,
      percent: row.percent,
      position: index,
    }))

    if (rows.length > 0) {
      const { error: rowsError } = await supabase
        .from("budget_distributions")
        .insert(rows)
      if (rowsError) return { error: rowsError.message }
    }
  }

  refresh()
  redirect("/dashboard")
}

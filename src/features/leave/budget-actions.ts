"use server"

import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "Leave budgets are not set up yet. Run supabase/migrations/0029_leave_budgets.sql and 0031_leave_types.sql against the project."

/**
 * Saves the whole budget sheet for one type and year. Each row comes in as an
 * `employeeId` and its `days:<id>`; a row left empty has no budget, which
 * means that person's leave of the type is not limited that year.
 */
export async function saveLeaveBudgets(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const year = Number(formData.get("year"))
  const leaveTypeId = String(formData.get("leaveTypeId") ?? "")
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return { error: "Pick a valid year." }
  if (!leaveTypeId) return { error: "Choose a leave type." }

  const ids = formData.getAll("employeeId").map(String).filter(Boolean)
  if (ids.length === 0) return { error: "There is nobody on the sheet to save." }

  const fieldErrors: Record<string, string> = {}
  const rows: { employee_id: string; leave_type_id: string; year: number; days: number }[] = []
  const cleared: string[] = []

  for (const id of ids) {
    const raw = String(formData.get(`days:${id}`) ?? "").trim()
    if (!raw) {
      cleared.push(id)
      continue
    }
    const days = Number(raw)
    if (!Number.isFinite(days) || days < 0 || days > 366 || !Number.isInteger(days * 2)) {
      fieldErrors[`days:${id}`] = "Whole or half days, like 12."
      continue
    }
    rows.push({ employee_id: id, leave_type_id: leaveTypeId, year, days })
  }

  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  await requirePermission("leave.manage")

  if (rows.length > 0) {
    const { error } = await supabase
      .from("leave_budgets")
      .upsert(rows, { onConflict: "employee_id,leave_type_id,year" })
    if (error) {
      return { error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
    }
  }

  if (cleared.length > 0) {
    const { error } = await supabase
      .from("leave_budgets")
      .delete()
      .eq("leave_type_id", leaveTypeId)
      .eq("year", year)
      .in("employee_id", cleared)
    if (error) {
      return { error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
    }
  }

  refresh()
  return { message: "Leave budgets saved.", savedAt: Date.now() }
}

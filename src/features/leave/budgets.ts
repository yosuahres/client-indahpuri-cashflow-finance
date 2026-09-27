import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"

import { leaveDaysInYear, type LeaveStatusValue } from "./constants"

/** One person's budget of one type for a year, and what they have drawn on it. */
export type LeaveBudget = {
  employeeId: string
  leaveTypeId: string
  year: number
  /** The budget itself. */
  days: number
  /** Approved days that fall in the year. */
  taken: number
  /** Days waiting on a decision. They hold the budget until decided (0029 §3). */
  pending: number
}

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "Leave budgets are not set up yet. Run supabase/migrations/0029_leave_budgets.sql and 0031_leave_types.sql against the project."

export type LeaveBudgetsResult = { ok: boolean; error?: string; budgets: LeaveBudget[] }

/**
 * Every budget set for the given years, with the leave drawn on each. Left is
 * `days - taken`, and what can still be asked for is that less `pending`.
 */
export async function loadLeaveBudgets(years: number[]): Promise<LeaveBudgetsResult> {
  await requirePermission("leave.manage")
  if (years.length === 0) return { ok: true, budgets: [] }

  const first = Math.min(...years)
  const last = Math.max(...years)

  const supabase = await createClient()
  const [budgets, spells] = await Promise.all([
    supabase
      .from("leave_budgets")
      .select("employee_id, leave_type_id, year, days")
      .in("year", years),
    supabase
      .from("leave_requests")
      .select("employee_id, leave_type_id, start_date, end_date, status")
      .neq("status", "rejected")
      .lte("start_date", `${last}-12-31`)
      .gte("end_date", `${first}-01-01`),
  ])

  const error = budgets.error ?? spells.error
  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      budgets: [],
    }
  }

  const rows = (spells.data ?? []) as {
    employee_id: string
    leave_type_id: string
    start_date: string
    end_date: string
    status: LeaveStatusValue
  }[]

  return {
    ok: true,
    budgets: (budgets.data ?? []).map((budget) => {
      let taken = 0
      let pending = 0
      for (const row of rows) {
        if (row.employee_id !== budget.employee_id || row.leave_type_id !== budget.leave_type_id) {
          continue
        }
        const inYear = leaveDaysInYear(row.start_date, row.end_date, budget.year as number)
        if (row.status === "approved") taken += inYear
        else pending += inYear
      }
      return {
        employeeId: budget.employee_id as string,
        leaveTypeId: budget.leave_type_id as string,
        year: budget.year as number,
        days: Number(budget.days),
        taken,
        pending,
      }
    }),
  }
}

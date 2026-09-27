import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"

import { leaveDaysInYear, type LeaveStatusValue } from "./constants"

/** One person's entitlement of one type for a year, and what they have drawn on it. */
export type LeaveEntitlement = {
  employeeId: string
  leaveTypeId: string
  year: number
  /** The entitlement itself. */
  days: number
  /** Approved days that fall in the year. */
  taken: number
  /** Days waiting on a decision. They hold the entitlement until decided (0029 §3). */
  pending: number
}

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "Leave entitlements are not set up yet. Run supabase/migrations/0029_leave_budgets.sql and 0031_leave_types.sql against the project."

export type LeaveEntitlementsResult = { ok: boolean; error?: string; entitlements: LeaveEntitlement[] }

/**
 * Every entitlement set for the given years, with the leave drawn on each. Left is
 * `days - taken`, and what can still be asked for is that less `pending`.
 */
export async function loadLeaveEntitlements(years: number[]): Promise<LeaveEntitlementsResult> {
  await requirePermission("leave.manage")
  if (years.length === 0) return { ok: true, entitlements: [] }

  const first = Math.min(...years)
  const last = Math.max(...years)

  const supabase = await createClient()
  const [entitlements, spells] = await Promise.all([
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

  const error = entitlements.error ?? spells.error
  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      entitlements: [],
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
    entitlements: (entitlements.data ?? []).map((entitlement) => {
      let taken = 0
      let pending = 0
      for (const row of rows) {
        if (row.employee_id !== entitlement.employee_id || row.leave_type_id !== entitlement.leave_type_id) {
          continue
        }
        const inYear = leaveDaysInYear(row.start_date, row.end_date, entitlement.year as number)
        if (row.status === "approved") taken += inYear
        else pending += inYear
      }
      return {
        employeeId: entitlement.employee_id as string,
        leaveTypeId: entitlement.leave_type_id as string,
        year: entitlement.year as number,
        days: Number(entitlement.days),
        taken,
        pending,
      }
    }),
  }
}

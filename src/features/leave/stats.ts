import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"
import type { Slice } from "@/features/employees/dashboard"
import { LEAVE_TYPES, leaveDays, type LeaveStatusValue, type LeaveTypeValue } from "./constants"

/**
 * The leave figures the HR dashboard carries: who is off right now, what is
 * waiting on a decision, and where this year's days have gone.
 *
 * The caller checks its own permission first — this only fetches, and returns
 * `ok: false` rather than throwing when 0027 has not been run.
 */
export type LeaveStats = {
  /** Approved spells covering today. */
  onLeaveToday: number
  /** Spells still waiting on a decision, of any date — the queue to work through. */
  pending: number
  /** Approved calendar days this year, by type. */
  daysByType: Slice[]
  daysThisYear: number
}

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "Leave is not set up yet. Run supabase/migrations/0027_attendance_and_leave.sql against the project."

export const EMPTY_LEAVE: LeaveStats = {
  onLeaveToday: 0,
  pending: 0,
  daysByType: [],
  daysThisYear: 0,
}

export type LeaveStatsResult = {
  ok: boolean
  error?: string
  stats: LeaveStats
}

export async function loadLeaveStats(today: string): Promise<LeaveStatsResult> {
  await requireUser()

  const yearStart = `${today.slice(0, 4)}-01-01`

  const supabase = await createClient()
  // This year's spells, plus anything still pending however old — a request
  // left undecided since last year is exactly the one worth surfacing.
  const { data, error } = await supabase
    .from("leave_requests")
    .select("leave_type, start_date, end_date, status")
    .or(`end_date.gte.${yearStart},status.eq.pending`)

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      stats: EMPTY_LEAVE,
    }
  }

  const rows = (data ?? []) as {
    leave_type: LeaveTypeValue
    start_date: string
    end_date: string
    status: LeaveStatusValue
  }[]

  const days = new Map<LeaveTypeValue, number>(LEAVE_TYPES.map((type) => [type.value, 0]))
  let onLeaveToday = 0
  let pending = 0
  let total = 0

  for (const row of rows) {
    if (row.status === "pending") pending += 1
    if (row.status !== "approved") continue

    if (row.start_date <= today && today <= row.end_date) onLeaveToday += 1

    // Only this year's days count towards the year's total; a spell that
    // started last December contributes the part that falls inside it.
    const from = row.start_date < yearStart ? yearStart : row.start_date
    if (from > row.end_date) continue
    const length = leaveDays(from, row.end_date)
    days.set(row.leave_type, (days.get(row.leave_type) ?? 0) + length)
    total += length
  }

  return {
    ok: true,
    stats: {
      onLeaveToday,
      pending,
      // Kept in the types' own order, with the empty ones dropped.
      daysByType: LEAVE_TYPES.map((type) => ({
        label: type.label,
        count: days.get(type.value) ?? 0,
        share: total > 0 ? (days.get(type.value) ?? 0) / total : 0,
      })).filter((slice) => slice.count > 0),
      daysThisYear: total,
    },
  }
}

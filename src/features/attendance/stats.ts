import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"
import type { Slice } from "@/features/employees/dashboard"
import { ATTENDANCE_STATUSES, type AttendanceStatusValue } from "./constants"

/**
 * The attendance figures the HR dashboard carries: how today stands, and how
 * the month has gone so far.
 *
 * The caller checks its own permission first — this only fetches, and returns
 * `ok: false` rather than throwing when 0027 has not been run.
 */
export type AttendanceStats = {
  /** Counted against the roll, so "not recorded" is the rest of it. */
  presentToday: number
  absentToday: number
  onLeaveToday: number
  recordedToday: number
  /** Days recorded since the first of the month, by status. */
  byStatusThisMonth: Slice[]
  /** Present or late, over everything recorded this month. Null when nothing is. */
  attendanceRate: number | null
}

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "Attendance is not set up yet. Run supabase/migrations/0027_attendance_and_leave.sql against the project."

export const EMPTY_ATTENDANCE: AttendanceStats = {
  presentToday: 0,
  absentToday: 0,
  onLeaveToday: 0,
  recordedToday: 0,
  byStatusThisMonth: [],
  attendanceRate: null,
}

export type AttendanceStatsResult = {
  ok: boolean
  error?: string
  stats: AttendanceStats
}

export async function loadAttendanceStats(today: string): Promise<AttendanceStatsResult> {
  await requireUser()

  // One read covers both: the month to date contains today.
  const monthStart = `${today.slice(0, 7)}-01`

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("on_date, status")
    .gte("on_date", monthStart)
    .lte("on_date", today)

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      stats: EMPTY_ATTENDANCE,
    }
  }

  const rows = (data ?? []) as { on_date: string; status: AttendanceStatusValue }[]

  const month = new Map<AttendanceStatusValue, number>(
    ATTENDANCE_STATUSES.map((status) => [status.value, 0]),
  )
  const day = new Map<AttendanceStatusValue, number>(
    ATTENDANCE_STATUSES.map((status) => [status.value, 0]),
  )

  for (const row of rows) {
    month.set(row.status, (month.get(row.status) ?? 0) + 1)
    if (row.on_date === today) day.set(row.status, (day.get(row.status) ?? 0) + 1)
  }

  const recordedToday = [...day.values()].reduce((total, count) => total + count, 0)
  const recordedMonth = rows.length
  const turnedUp = (month.get("present") ?? 0) + (month.get("late") ?? 0)

  return {
    ok: true,
    stats: {
      // Late is still turning up, so it counts towards present.
      presentToday: (day.get("present") ?? 0) + (day.get("late") ?? 0),
      absentToday: day.get("absent") ?? 0,
      onLeaveToday: day.get("leave") ?? 0,
      recordedToday,
      // Kept in the statuses' own order, with the empty ones dropped.
      byStatusThisMonth: ATTENDANCE_STATUSES.map((status) => ({
        label: status.label,
        count: month.get(status.value) ?? 0,
        share: recordedMonth > 0 ? (month.get(status.value) ?? 0) / recordedMonth : 0,
      })).filter((slice) => slice.count > 0),
      attendanceRate: recordedMonth > 0 ? turnedUp / recordedMonth : null,
    },
  }
}

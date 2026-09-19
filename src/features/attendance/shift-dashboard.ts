import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"
import type { Slice } from "@/features/employees/dashboard"
import { ATTENDANCE_STATUSES, type AttendanceStatusValue } from "./constants"

/**
 * The Shift & Attendance dashboard's figures, for one calendar month.
 *
 * Everything here comes from the attendance table. There is no shift roster on
 * file, so nothing is derived against a scheduled start or end — "late" is the
 * status somebody recorded, not a comparison, and early exit cannot be worked
 * out at all.
 */
export type DayCount = {
  /** ISO `YYYY-MM-DD`. */
  date: string
  counts: Record<AttendanceStatusValue, number>
  total: number
}

export type ShiftDashboard = {
  /** The month these figures cover, as `YYYY-MM`. */
  month: string
  present: number
  absent: number
  late: number
  onLeave: number
  /** Whole minutes clocked, over every day with both a check-in and check-out. */
  minutes: number
  /** How many of those days had both, so the hours can be read as a floor. */
  clockedDays: number
  /** Every day of the month so far, in order. */
  perDay: DayCount[]
  /** Hours per department, biggest first. `count` is whole hours. */
  hoursByDepartment: Slice[]
}

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "Attendance is not set up yet. Run supabase/migrations/0027_attendance_and_leave.sql against the project."

export type ShiftDashboardResult = {
  ok: boolean
  error?: string
  dashboard: ShiftDashboard
}

function emptyCounts(): Record<AttendanceStatusValue, number> {
  return { present: 0, late: 0, absent: 0, leave: 0, holiday: 0 }
}

function empty(month: string): ShiftDashboard {
  return {
    month,
    present: 0,
    absent: 0,
    late: 0,
    onLeave: 0,
    minutes: 0,
    clockedDays: 0,
    perDay: [],
    hoursByDepartment: [],
  }
}

/** Minutes between two clock times, counting a check-out before the check-in as overnight. */
function minutesBetween(checkIn: string | null, checkOut: string | null): number | null {
  if (!checkIn || !checkOut) return null
  const [inH, inM] = checkIn.split(":").map(Number)
  const [outH, outM] = checkOut.split(":").map(Number)
  if ([inH, inM, outH, outM].some(Number.isNaN)) return null
  let minutes = outH * 60 + outM - (inH * 60 + inM)
  if (minutes < 0) minutes += 24 * 60
  return minutes
}

/** Every day of `month` up to and including `through`, as ISO dates. */
function daysOf(month: string, through: string): string[] {
  const [year, monthNumber] = month.split("-").map(Number)
  // Day 0 of the next month is the last day of this one.
  const last = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  const days: string[] = []
  for (let day = 1; day <= last; day += 1) {
    const date = `${month}-${String(day).padStart(2, "0")}`
    if (date > through) break
    days.push(date)
  }
  return days
}

export async function loadShiftDashboard(
  month: string,
  today: string,
): Promise<ShiftDashboardResult> {
  await requireUser()

  const monthStart = `${month}-01`
  // A month already gone shows all of itself; the current one stops at today.
  const through = month === today.slice(0, 7) ? today : `${month}-31`

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("on_date, status, check_in, check_out, employees(department)")
    .gte("on_date", monthStart)
    .lte("on_date", through)

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      dashboard: empty(month),
    }
  }

  const totals = emptyCounts()
  const days = new Map<string, Record<AttendanceStatusValue, number>>()
  const departmentMinutes = new Map<string, number>()
  let minutes = 0
  let clockedDays = 0

  for (const row of data ?? []) {
    const status = row.status as AttendanceStatusValue
    const date = row.on_date as string
    totals[status] = (totals[status] ?? 0) + 1

    const day = days.get(date) ?? emptyCounts()
    day[status] = (day[status] ?? 0) + 1
    days.set(date, day)

    const worked = minutesBetween(row.check_in as string | null, row.check_out as string | null)
    if (worked === null) continue
    minutes += worked
    clockedDays += 1

    // PostgREST gives an embedded row as an object, or as a one-item array
    // depending on how it reads the relationship.
    const joined = row.employees as
      | { department?: unknown }
      | { department?: unknown }[]
      | null
    const employee = Array.isArray(joined) ? joined[0] : joined
    const label =
      typeof employee?.department === "string" && employee.department.trim()
        ? employee.department
        : "Unassigned"
    departmentMinutes.set(label, (departmentMinutes.get(label) ?? 0) + worked)
  }

  const hoursTotal = [...departmentMinutes.values()].reduce((sum, value) => sum + value, 0)

  return {
    ok: true,
    dashboard: {
      month,
      present: totals.present,
      absent: totals.absent,
      late: totals.late,
      onLeave: totals.leave,
      minutes,
      clockedDays,
      perDay: daysOf(month, through).map((date) => {
        const counts = days.get(date) ?? emptyCounts()
        return {
          date,
          counts,
          total: ATTENDANCE_STATUSES.reduce((sum, status) => sum + counts[status.value], 0),
        }
      }),
      hoursByDepartment: [...departmentMinutes]
        .map(([label, value]) => ({
          label,
          count: Math.round(value / 60),
          share: hoursTotal > 0 ? value / hoursTotal : 0,
        }))
        .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label)),
    },
  }
}

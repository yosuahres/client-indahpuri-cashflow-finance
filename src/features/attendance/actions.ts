"use server"

import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { ATTENDANCE_STATUSES, NON_WORKING, type AttendanceStatusValue } from "./constants"

/** One employee's day, as the day sheet holds it. */
export type AttendanceEntry = {
  employeeId: string
  /** Empty when nothing has been recorded for them that day. */
  status: AttendanceStatusValue | ""
  /** `HH:MM`, or empty when nothing was clocked. */
  checkIn: string
  checkOut: string
  note: string
}

const UNDEFINED_TABLE = "42P01"

const MIGRATION_HINT =
  "The attendance table does not exist yet. Run supabase/migrations/0027_attendance_and_leave.sql against the project."

function errorMessage(error: { code?: string; message: string }) {
  return error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message
}

/** Postgres hands back `HH:MM:SS`; the sheet wants `HH:MM`. */
function toClock(value: string | null): string {
  return value ? value.slice(0, 5) : ""
}

export type AttendanceDayResult = {
  ok: boolean
  error?: string
  /** Keyed by employee id. Employees with no row that day are absent from it. */
  entries: Record<string, AttendanceEntry>
}

/** Everything recorded on one date, for the whole roll. */
export async function loadAttendanceDay(date: string): Promise<AttendanceDayResult> {
  await requirePermission("attendance.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("attendance")
    .select("employee_id, status, check_in, check_out, note")
    .eq("on_date", date)

  if (error) return { ok: false, error: errorMessage(error), entries: {} }

  const entries: Record<string, AttendanceEntry> = {}
  for (const row of data ?? []) {
    const employeeId = row.employee_id as string
    entries[employeeId] = {
      employeeId,
      status: row.status as AttendanceStatusValue,
      checkIn: toClock(row.check_in as string | null),
      checkOut: toClock(row.check_out as string | null),
      note: (row.note as string | null) ?? "",
    }
  }
  return { ok: true, entries }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

const isStatus = (value: string): value is AttendanceStatusValue =>
  ATTENDANCE_STATUSES.some((entry) => entry.value === value)

/**
 * Saves a whole day at once: one row per employee given a status, and no row
 * for anyone left unrecorded — clearing someone's status removes their day
 * rather than leaving a blank one behind.
 *
 * The sheet names its controls `status:<employee id>` and so on, so which
 * employees are on it is read off the form rather than trusted from elsewhere.
 */
export async function saveAttendanceDay(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const date = String(formData.get("date") ?? "").trim()
  if (!ISO_DATE.test(date)) return { error: "Pick a valid date." }

  const ids = formData.getAll("employeeId").map(String).filter(Boolean)
  if (ids.length === 0) return { error: "There is nobody on the sheet to save." }

  const fieldErrors: Record<string, string> = {}
  const rows: {
    employee_id: string
    on_date: string
    status: AttendanceStatusValue
    check_in: string | null
    check_out: string | null
    note: string | null
  }[] = []
  const cleared: string[] = []

  for (const id of ids) {
    const status = String(formData.get(`status:${id}`) ?? "").trim()
    const checkIn = String(formData.get(`checkIn:${id}`) ?? "").trim()
    const checkOut = String(formData.get(`checkOut:${id}`) ?? "").trim()
    const note = String(formData.get(`note:${id}`) ?? "").trim()

    if (!status) {
      cleared.push(id)
      continue
    }
    if (!isStatus(status)) {
      fieldErrors[`status:${id}`] = "Choose a status."
      continue
    }

    // A day off has no hours on it, so the clocks are dropped rather than kept
    // to contradict the status.
    const offDuty = NON_WORKING.includes(status)
    if (!offDuty && checkIn && !CLOCK.test(checkIn)) {
      fieldErrors[`checkIn:${id}`] = "Use a 24-hour time, like 08:30."
    }
    if (!offDuty && checkOut && !CLOCK.test(checkOut)) {
      fieldErrors[`checkOut:${id}`] = "Use a 24-hour time, like 17:00."
    }
    if (note.length > 200) fieldErrors[`note:${id}`] = "Keep the note under 200 characters."

    rows.push({
      employee_id: id,
      on_date: date,
      status,
      check_in: offDuty ? null : checkIn || null,
      check_out: offDuty ? null : checkOut || null,
      note: note || null,
    })
  }

  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  await requirePermission("attendance.manage")

  if (rows.length > 0) {
    // One row per employee per day, so a day already taken is corrected.
    const { error } = await supabase
      .from("attendance")
      .upsert(rows, { onConflict: "employee_id,on_date" })
    if (error) return { error: errorMessage(error) }
  }

  if (cleared.length > 0) {
    const { error } = await supabase
      .from("attendance")
      .delete()
      .eq("on_date", date)
      .in("employee_id", cleared)
    if (error) return { error: errorMessage(error) }
  }

  refresh()
  // `savedAt` changes each time, so a second identical save still toasts.
  return { message: `Attendance saved for ${rows.length} of ${ids.length}.`, savedAt: Date.now() }
}

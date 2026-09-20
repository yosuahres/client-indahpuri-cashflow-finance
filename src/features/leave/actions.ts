"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { flash } from "@/lib/flash"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import {
  LEAVE_STATUSES,
  LEAVE_TYPES,
  type LeaveStatusValue,
  type LeaveTypeValue,
} from "./constants"

/** One spell of leave, with whose it is. */
export type LeaveEntry = {
  id: string
  employeeId: string
  employeeName: string
  employeeNo: string
  leaveType: LeaveTypeValue
  /** ISO `YYYY-MM-DD`, both ends inclusive. */
  startDate: string
  endDate: string
  status: LeaveStatusValue
  reason: string | null
  /** When the leave was filed, as an ISO timestamp. */
  createdAt: string
}

const UNDEFINED_TABLE = "42P01"
/** An exclusion constraint refused the row — `leave_no_overlap`. */
const EXCLUSION_VIOLATION = "23P01"

const MIGRATION_HINT =
  "The leave table does not exist yet. Run supabase/migrations/0027_attendance_and_leave.sql against the project."

const OVERLAP_HINT =
  "Those days overlap leave already on the record. Reject or change the other spell first."

function errorMessage(error: { code?: string; message: string }) {
  if (error.code === UNDEFINED_TABLE) return MIGRATION_HINT
  if (error.code === EXCLUSION_VIOLATION) return OVERLAP_HINT
  return error.message
}

export type LeaveResult = {
  ok: boolean
  error?: string
  entries: LeaveEntry[]
}

/**
 * Leave across everyone, most recent spell first. Narrowed to one status when
 * given one — the list opens on Pending, which is the queue to work through.
 */
export async function listLeave(status?: LeaveStatusValue): Promise<LeaveResult> {
  await requirePermission("leave.manage")

  const supabase = await createClient()
  let query = supabase
    .from("leave_requests")
    .select("id, employee_id, leave_type, start_date, end_date, status, reason, created_at, employees(full_name, employee_no)")
    .order("start_date", { ascending: false })

  if (status) query = query.eq("status", status)

  const { data, error } = await query
  if (error) return { ok: false, error: errorMessage(error), entries: [] }

  return {
    ok: true,
    entries: (data ?? []).map((row) => {
      // PostgREST gives an embedded row as an object, or as a one-item array
      // depending on how it reads the relationship.
      const joined = row.employees as
        | { full_name?: unknown; employee_no?: unknown }
        | { full_name?: unknown; employee_no?: unknown }[]
        | null
      const employee = Array.isArray(joined) ? joined[0] : joined

      return {
        id: row.id as string,
        employeeId: row.employee_id as string,
        employeeName:
          typeof employee?.full_name === "string" ? employee.full_name : "Unknown employee",
        employeeNo: typeof employee?.employee_no === "string" ? employee.employee_no : "",
        leaveType: row.leave_type as LeaveTypeValue,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        status: row.status as LeaveStatusValue,
        reason: (row.reason as string | null) || null,
        createdAt: row.created_at as string,
      }
    }),
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export async function recordLeave(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const employeeId = String(formData.get("employeeId") ?? "")
  const leaveType = String(formData.get("leaveType") ?? "").trim()
  const startDate = String(formData.get("startDate") ?? "").trim()
  const endDate = String(formData.get("endDate") ?? "").trim()
  const status = String(formData.get("status") ?? "").trim()
  const reason = String(formData.get("reason") ?? "").trim()

  const fieldErrors: Record<string, string> = {}
  if (!employeeId) fieldErrors.employeeId = "Choose an employee."
  if (!LEAVE_TYPES.some((entry) => entry.value === leaveType)) {
    fieldErrors.leaveType = "Choose a leave type."
  }
  if (!ISO_DATE.test(startDate)) fieldErrors.startDate = "Pick a valid date."
  if (!ISO_DATE.test(endDate)) fieldErrors.endDate = "Pick a valid date."
  if (!fieldErrors.startDate && !fieldErrors.endDate && endDate < startDate) {
    fieldErrors.endDate = "The last day cannot come before the first."
  }
  if (!LEAVE_STATUSES.some((entry) => entry.value === status)) {
    fieldErrors.status = "Choose a status."
  }
  if (reason.length > 300) fieldErrors.reason = "Keep the reason under 300 characters."
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  await requirePermission("leave.manage")

  const { error } = await supabase.from("leave_requests").insert({
    employee_id: employeeId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    status,
    reason: reason || null,
  })

  if (error) return { error: errorMessage(error) }

  refresh()
  await flash("success", "Leave recorded.")
  redirect("/hris/leave")
}

export type RowResult = { ok: boolean; error?: string }

/**
 * Approves or rejects a spell already on the record. Rejecting frees its days,
 * so the same dates can be asked for again.
 */
export async function setLeaveStatus(id: string, status: LeaveStatusValue): Promise<RowResult> {
  if (!id) return { ok: false, error: "That leave is no longer on the record." }
  if (!LEAVE_STATUSES.some((entry) => entry.value === status)) {
    return { ok: false, error: "That is not a leave status." }
  }
  await requirePermission("leave.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_requests")
    .update({ status })
    .eq("id", id)
    // Returning the row is what makes this real rather than assumed.
    .select("id")

  if (error) return { ok: false, error: errorMessage(error) }
  if (!data || data.length === 0) {
    return { ok: false, error: "That leave is no longer on the record." }
  }

  refresh()
  return { ok: true }
}

export async function deleteLeave(id: string): Promise<RowResult> {
  if (!id) return { ok: false, error: "Nothing to remove." }
  await requirePermission("leave.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_requests")
    .delete()
    .eq("id", id)
    .select("id")

  if (error) return { ok: false, error: errorMessage(error) }
  if (!data || data.length === 0) {
    return { ok: false, error: "That leave is no longer on the record." }
  }

  refresh()
  return { ok: true }
}

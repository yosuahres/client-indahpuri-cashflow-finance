"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { flash } from "@/lib/flash"
import { PHOTO_BUCKET, type EmployeeStatusValue, type EmploymentTypeValue } from "./constants"
import { EMPLOYEE_FIELDS, type EmployeeRecord, type EmployeeValues } from "./fields"
import { readEmployee, validateEmployee } from "./validation"

/** What the employee list shows for each person. */
export type Employee = {
  id: string
  employeeNo: string
  fullName: string
  position: string | null
  department: string | null
  employmentType: EmploymentTypeValue
  /** ISO `YYYY-MM-DD`. */
  joinDate: string | null
  status: EmployeeStatusValue
  /** When the record was entered, as an ISO timestamp. */
  createdAt: string
  /**
   * Every field on the person, keyed as `EMPLOYEE_FIELDS` names it. The list
   * shows a handful by default and offers the rest as columns, so it reads
   * them from here rather than growing a property each time one is added.
   */
  fields: Record<string, string | null>
}

const UNDEFINED_TABLE = "42P01"
const UNDEFINED_COLUMN = "42703"
const UNIQUE_VIOLATION = "23505"
/** A malformed id in the URL — no row could ever match it. */
const INVALID_TEXT = "22P02"

const MIGRATION_HINT =
  "The employees table does not exist yet. Run supabase/migrations/0017_employees.sql against the project."

const DETAILS_MIGRATION_HINT =
  "Some employee columns do not exist yet. Run supabase/migrations/0018_employee_details.sql, 0019_employee_photos.sql and 0023_employee_data_fields.sql against the project."

function errorMessage(error: { code?: string; message: string }) {
  if (error.code === UNDEFINED_TABLE) return MIGRATION_HINT
  if (error.code === UNDEFINED_COLUMN) return DETAILS_MIGRATION_HINT
  return error.message
}

const LIST_COLUMNS = [
  "id",
  "created_at",
  ...EMPLOYEE_FIELDS.map((field) => field.column),
].join(", ")

const DETAIL_COLUMNS = [
  "id",
  "photo_path",
  ...EMPLOYEE_FIELDS.map((field) => field.column),
].join(", ")

/** The form's text values as stored — blanks become null, numbers become numbers. */
function toRow(values: EmployeeValues) {
  return Object.fromEntries(
    EMPLOYEE_FIELDS.map((field) => {
      const value = values[field.name] ?? ""
      if (!value) return [field.column, null]
      return [field.column, field.type === "money" ? Number(value) : value]
    }),
  )
}

export type EmployeesResult =
  | { ok: true; employees: Employee[] }
  | { ok: false; error: string; employees: Employee[] }

export async function listEmployees(): Promise<EmployeesResult> {
  await requirePermission("employees.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(LIST_COLUMNS)
    .order("full_name")

  if (error) return { ok: false, error: errorMessage(error), employees: [] }

  return {
    ok: true,
    // The column list is built from the field registry, so it is not a literal
    // the client can infer a row type from — the same cast `getEmployee` uses.
    employees: ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      employeeNo: row.employee_no as string,
      fullName: row.full_name as string,
      position: row.position as string | null,
      department: row.department as string | null,
      employmentType: row.employment_type as EmploymentTypeValue,
      joinDate: row.join_date as string | null,
      status: row.status as EmployeeStatusValue,
      createdAt: row.created_at as string,
      fields: Object.fromEntries(
        EMPLOYEE_FIELDS.map((field) => {
          const value = row[field.column]
          return [field.name, value === null || value === undefined ? null : String(value)]
        }),
      ),
    })),
  }
}

export type EmployeeResult =
  | { ok: true; employee: EmployeeRecord | null }
  | { ok: false; error: string; employee: null }

/** One employee with every field the details page shows. */
export async function getEmployee(id: string): Promise<EmployeeResult> {
  await requirePermission("employees.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle()

  if (error) {
    if (error.code === INVALID_TEXT) return { ok: true, employee: null }
    return { ok: false, error: errorMessage(error), employee: null }
  }
  if (!data) return { ok: true, employee: null }

  const row = data as unknown as Record<string, unknown>
  const photoPath = row.photo_path as string | null
  // The bucket is private; a short-lived link is all the page needs.
  const { data: signed } = photoPath
    ? await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(photoPath, 60 * 60)
    : { data: null }

  return {
    ok: true,
    employee: {
      id: row.id as string,
      fullName: row.full_name as string,
      employeeNo: row.employee_no as string,
      photoUrl: signed?.signedUrl ?? null,
      values: Object.fromEntries(
        EMPLOYEE_FIELDS.map((field) => {
          const value = row[field.column]
          return [field.name, value === null || value === undefined ? "" : String(value)]
        }),
      ),
    },
  }
}

export type RowResult = { ok: boolean; error?: string }

function duplicateIdError(employeeNo: string): FormState {
  return { fieldErrors: { employeeNo: `Employee ID "${employeeNo}" is already taken.` } }
}

export async function createEmployee(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = readEmployee(formData)
  const fieldErrors = validateEmployee(values)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const user = await requirePermission("employees.manage")

  const { error } = await supabase
    .from("employees")
    .insert({ user_id: user.id, ...toRow(values) })

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return duplicateIdError(values.employeeNo)
    return { error: errorMessage(error) }
  }

  refresh()
  await flash("success", "Employee added.")
  redirect("/hris/employees")
}

export async function updateEmployee(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "")
  if (!id) return { error: "That employee is no longer open." }

  const values = readEmployee(formData)
  const fieldErrors = validateEmployee(values)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  await requirePermission("employees.manage")

  const { data, error } = await supabase
    .from("employees")
    .update(toRow(values))
    .eq("id", id)
    // Returning the row is what makes this real rather than assumed.
    .select("id")

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return duplicateIdError(values.employeeNo)
    return { error: errorMessage(error) }
  }
  if (!data || data.length === 0) return { error: "That employee no longer exists." }

  refresh()
  await flash("success", "Employee saved.")
  redirect("/hris/employees")
}

export type DeleteResult = { ok: boolean; error?: string; deleted: number }

/**
 * Removes employees outright, with their photos — nothing keeps a tombstone,
 * so the caller is expected to have confirmed first.
 */
export async function deleteEmployees(ids: string[]): Promise<DeleteResult> {
  const unique = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))]
  if (unique.length === 0) return { ok: false, error: "Nothing selected.", deleted: 0 }
  await requirePermission("employees.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .delete()
    .in("id", unique)
    // Returning the rows is what makes the count real rather than assumed.
    .select("id, photo_path")

  if (error) return { ok: false, error: errorMessage(error), deleted: 0 }

  const photos = (data ?? []).flatMap((row) => (row.photo_path as string | null) ?? [])
  // Best effort: a leftover file costs storage, not correctness.
  if (photos.length > 0) await supabase.storage.from(PHOTO_BUCKET).remove(photos)

  refresh()
  return { ok: true, deleted: data?.length ?? 0 }
}

/**
 * Points an employee at a photo the browser has just uploaded, and removes the
 * one it replaces. The upload goes straight to storage rather than through
 * here, so a phone photo is not held back by the server action body limit.
 */
export async function setEmployeePhoto(id: string, path: string): Promise<RowResult> {
  await requirePermission("employees.manage")
  // Only a file inside this employee's own folder.
  if (!id || !path.startsWith(`${id}/`) || path.includes("..")) {
    return { ok: false, error: "That photo could not be saved." }
  }

  const supabase = await createClient()
  const { data: before, error: readError } = await supabase
    .from("employees")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle()

  if (readError) return { ok: false, error: errorMessage(readError) }
  if (!before) return { ok: false, error: "That employee no longer exists." }

  const { error } = await supabase.from("employees").update({ photo_path: path }).eq("id", id)
  if (error) return { ok: false, error: errorMessage(error) }

  const oldPath = before.photo_path as string | null
  // Best effort: a leftover file costs storage, not correctness.
  if (oldPath && oldPath !== path) await supabase.storage.from(PHOTO_BUCKET).remove([oldPath])

  refresh()
  return { ok: true }
}

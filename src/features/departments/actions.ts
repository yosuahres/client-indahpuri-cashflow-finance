"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission, requireUser } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { flash } from "@/lib/flash"
import { safeRedirectPath } from "@/lib/site-url"

export type Department = { id: string; name: string }

const UNDEFINED_TABLE = "42P01"
const UNIQUE_VIOLATION = "23505"

const MIGRATION_HINT =
  "The departments table does not exist yet. Run supabase/migrations/0020_departments.sql against the project."

export type DepartmentsResult =
  | { ok: true; departments: Department[] }
  | { ok: false; error: string; departments: Department[] }

export async function listDepartments(): Promise<DepartmentsResult> {
  await requireUser()

  const supabase = await createClient()
  const { data, error } = await supabase.from("departments").select("id, name").order("name")

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      departments: [],
    }
  }

  return {
    ok: true,
    departments: (data ?? []).map((row) => ({ id: row.id as string, name: row.name as string })),
  }
}

export async function createDepartment(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim()

  const fieldErrors: Record<string, string> = {}
  if (!name) fieldErrors.name = "Give the department a name."
  else if (name.length > 80) fieldErrors.name = "Keep the name under 80 characters."
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const user = await requirePermission("departments.manage")

  const { error } = await supabase.from("departments").insert({ user_id: user.id, name })

  if (error) {
    if (error.code === UNDEFINED_TABLE) return { error: MIGRATION_HINT }
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: `There is already a department called "${name}".` } }
    }
    return { error: error.message }
  }

  refresh()

  // Return to whatever sent us here, with the new department picked.
  const next = safeRedirectPath(formData.get("next")?.toString(), "/hris/departments")
  const separator = next.includes("?") ? "&" : "?"
  await flash("success", "Department added.")
  redirect(`${next}${separator}department=${encodeURIComponent(name)}`)
}

export type RowResult = { ok: boolean; error?: string }

/**
 * Removes one department. Employees keep the name they were filed under; it
 * just stops being offered on the form. The caller confirms first.
 */
export async function deleteDepartment(id: string): Promise<RowResult> {
  if (!id) return { ok: false, error: "That department is no longer open." }
  await requirePermission("departments.manage")

  const supabase = await createClient()
  const { data, error } = await supabase.from("departments").delete().eq("id", id).select("id")

  if (error) {
    return { ok: false, error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }
  if (!data || data.length === 0) return { ok: false, error: "That department no longer exists." }

  refresh()
  return { ok: true }
}

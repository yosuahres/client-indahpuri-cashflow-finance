"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { flash } from "@/lib/flash"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { safeRedirectPath } from "@/lib/site-url"

/** One kind of leave, as set up on the Leave Types page. */
export type LeaveType = {
  id: string
  name: string
  /** When it was added, as an ISO timestamp. */
  createdAt: string
}

const UNDEFINED_TABLE = "42P01"
const UNIQUE_VIOLATION = "23505"
const FOREIGN_KEY_VIOLATION = "23503"

const MIGRATION_HINT =
  "Leave types are not set up yet. Run supabase/migrations/0031_leave_types.sql against the project."

function errorMessage(error: { code?: string; message: string }) {
  return error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message
}

export type LeaveTypesResult = { ok: boolean; error?: string; types: LeaveType[] }

/** Every leave type, in the order they were added — Annual first, as seeded. */
export async function listLeaveTypes(): Promise<LeaveTypesResult> {
  await requirePermission("leave.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("leave_types")
    .select("id, name, created_at")
    .order("created_at")
    .order("name")

  if (error) return { ok: false, error: errorMessage(error), types: [] }
  return {
    ok: true,
    types: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      createdAt: row.created_at as string,
    })),
  }
}

export async function createLeaveType(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim()

  const fieldErrors: Record<string, string> = {}
  if (!name) fieldErrors.name = "Give the leave type a name."
  else if (name.length > 60) fieldErrors.name = "Keep the name under 60 characters."
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  await requirePermission("leave.manage")

  const { error } = await supabase.from("leave_types").insert({ name })

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: `There is already a leave type called "${name}".` } }
    }
    return { error: errorMessage(error) }
  }

  refresh()
  // Back to whatever sent us here — the budget sheet or the leave form, often.
  const next = safeRedirectPath(formData.get("next")?.toString(), "/hris/leave/types")
  await flash("success", "Leave type added.")
  redirect(next)
}

export type RowResult = { ok: boolean; error?: string }

/** Removes a leave type no leave is recorded against. Its budgets go with it. */
export async function deleteLeaveType(id: string): Promise<RowResult> {
  if (!id) return { ok: false, error: "Nothing to remove." }
  await requirePermission("leave.manage")

  const supabase = await createClient()
  const { data, error } = await supabase.from("leave_types").delete().eq("id", id).select("id")

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { ok: false, error: "Leave is recorded against that type, so it has to stay." }
    }
    return { ok: false, error: errorMessage(error) }
  }
  if (!data || data.length === 0) return { ok: false, error: "That leave type no longer exists." }

  refresh()
  return { ok: true }
}

"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { isPermission } from "@/features/auth/permissions"
import { FALLBACK_ROLES, roleKeyFrom, type RoleSummary } from "@/features/auth/roles"
import { requirePermission, requireUser } from "@/features/auth/session"
import { flash } from "@/lib/flash"
import { hasFieldErrors, type FormState } from "@/lib/form-state"

export type RolesResult =
  | { ok: true; roles: RoleSummary[] }
  | { ok: false; error: string; roles: RoleSummary[] }

export type RowResult = { ok: boolean; error?: string }

const UNDEFINED_TABLE = "42P01"
const UNIQUE_VIOLATION = "23505"
const FOREIGN_KEY_VIOLATION = "23503"

const MIGRATION_HINT =
  "Custom roles are not set up yet. Run supabase/migrations/0025_custom_roles.sql against the project."

/** Every role, built-in first, then by name. */
export async function listRoles(): Promise<RolesResult> {
  // Read by the Users picker as well as Settings, and callable from any browser.
  await requireUser()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("roles")
    .select("key, name, description, built_in")
    .order("built_in", { ascending: false })
    .order("name")

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      roles: FALLBACK_ROLES,
    }
  }

  return {
    ok: true,
    roles: (data ?? []).map((row) => ({
      key: row.key as string,
      name: row.name as string,
      description: (row.description as string) ?? "",
      builtIn: row.built_in === true,
    })),
  }
}

function readRole(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ")
  const description = String(formData.get("description") ?? "").trim()

  const fieldErrors: Record<string, string> = {}
  if (!name) fieldErrors.name = "Give the role a name."
  else if (name.length > 40) fieldErrors.name = "Keep the name under 40 characters."
  if (description.length > 160) fieldErrors.description = "Keep the description under 160 characters."

  return { name, description, fieldErrors }
}

/**
 * Adds a role. It starts with no permissions — or, with "Start from", the same
 * ones as an existing role — and goes straight to the grid to be ticked.
 */
export async function createRole(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("users.manage")

  const { name, description, fieldErrors } = readRole(formData)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }
  const copyFrom = String(formData.get("copyFrom") ?? "")

  const supabase = await createClient()

  // Two roles whose names differ only in punctuation would share a key, so the
  // key takes a number rather than refusing a name that is not a duplicate.
  const base = roleKeyFrom(name)
  const { data: taken, error: takenError } = await supabase
    .from("roles")
    .select("key")
    .like("key", `${base}%`)
  if (takenError) {
    return { error: takenError.code === UNDEFINED_TABLE ? MIGRATION_HINT : takenError.message }
  }
  const keys = new Set((taken ?? []).map((row) => row.key as string))
  let key = base
  for (let n = 2; keys.has(key); n++) key = `${base}_${n}`

  const { error } = await supabase.from("roles").insert({ key, name, description })
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: "There is already a role with this name." } }
    }
    return { error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }

  if (copyFrom) {
    const { data: grants } = await supabase
      .from("role_permissions")
      .select("permission")
      .eq("role", copyFrom)
    const rows = (grants ?? [])
      .map((row) => row.permission)
      .filter(isPermission)
      // User management is how someone hands out roles, Manager included;
      // it is never copied onto a new role without being ticked on purpose.
      .filter((permission) => permission !== "users.manage")
      .map((permission) => ({ role: key, permission }))

    if (rows.length > 0) {
      const { error: copyError } = await supabase.from("role_permissions").insert(rows)
      if (copyError) {
        refresh()
        await flash("error", `${name} was created, but its permissions were not copied: ${copyError.message}`)
        redirect("/settings/permissions")
      }
    }
  }

  refresh()
  await flash("success", `${name} created. Tick what it may do.`)
  redirect("/settings/permissions")
}

export async function updateRole(_prevState: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("users.manage")

  const key = String(formData.get("key") ?? "")
  if (!key) return { error: "That role is no longer open." }
  const { name, description, fieldErrors } = readRole(formData)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("roles")
    .update({ name, description })
    .eq("key", key)
    .select("key")

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: "There is already a role with this name." } }
    }
    return { error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }
  if (!data || data.length === 0) return { error: "That role no longer exists." }

  refresh()
  await flash("success", "Role saved.")
  redirect("/settings/roles")
}

/** Removes a role and its ticks. Refused for built-in roles and roles in use. */
export async function deleteRole(key: string): Promise<RowResult> {
  await requirePermission("users.manage")
  if (!key) return { ok: false, error: "That role is no longer listed." }

  const supabase = await createClient()
  const { data, error } = await supabase.from("roles").delete().eq("key", key).select("key")

  if (error) {
    if (error.code === FOREIGN_KEY_VIOLATION) {
      return { ok: false, error: "People still have this role. Give them another role first." }
    }
    // The built-in trigger raises a sentence meant to be shown as it is.
    return { ok: false, error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }
  if (!data || data.length === 0) return { ok: false, error: "That role no longer exists." }

  refresh()
  return { ok: true }
}

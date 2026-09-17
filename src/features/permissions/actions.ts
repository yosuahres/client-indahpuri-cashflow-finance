"use server"

import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import {
  DEFAULT_GRANTS,
  isLocked,
  isPermission,
  type Permission,
} from "@/features/auth/permissions"
import { isRole, type Role } from "@/features/auth/roles"
import { requirePermission } from "@/features/auth/session"

/** Each role's ticks. A role with none may be missing — read with `?? []`. */
export type Grants = Partial<Record<Role, Permission[]>>

export type GrantsResult =
  | { ok: true; grants: Grants }
  | { ok: false; error: string; grants: Grants }

export type RowResult = { ok: boolean; error?: string }

const UNDEFINED_TABLE = "42P01"

const MIGRATION_HINT =
  "Role permissions are not set up yet, so roles keep their old access. Run " +
  "supabase/migrations/0024_role_permissions.sql against the project to edit them."

/** What every role is ticked for. */
export async function listGrants(): Promise<GrantsResult> {
  await requirePermission("users.manage")

  const supabase = await createClient()
  const { data, error } = await supabase.from("role_permissions").select("role, permission")

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      grants: DEFAULT_GRANTS,
    }
  }

  const grants: Grants = {}
  for (const row of data ?? []) {
    if (isRole(row.role) && isPermission(row.permission)) {
      ;(grants[row.role] ??= []).push(row.permission)
    }
  }
  return { ok: true, grants }
}

/**
 * Ticks or unticks one permission for one role. It holds from everyone in that
 * role's next click, as a role change does.
 */
export async function setGrant(
  role: Role,
  permission: Permission,
  granted: boolean,
): Promise<RowResult> {
  await requirePermission("users.manage")

  if (!isRole(role) || !isPermission(permission)) {
    return { ok: false, error: "That permission is not recognised." }
  }
  if (!granted && isLocked(role, permission)) {
    return { ok: false, error: "Managers always manage users, roles and permissions." }
  }

  const supabase = await createClient()
  const { error } = granted
    ? await supabase
        .from("role_permissions")
        .upsert({ role, permission }, { onConflict: "role,permission", ignoreDuplicates: true })
    : await supabase.from("role_permissions").delete().match({ role, permission })

  // The keep-manager trigger raises a sentence meant to be shown as it is.
  if (error) {
    if (error.code === "23503") return { ok: false, error: "That role no longer exists." }
    return { ok: false, error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }

  refresh()
  return { ok: true }
}

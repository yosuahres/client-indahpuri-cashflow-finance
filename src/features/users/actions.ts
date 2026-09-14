"use server"

import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireRole } from "@/features/auth/session"
import { isRole, type Role } from "@/features/auth/roles"

export type TeamMember = {
  id: string
  email: string
  name: string
  /** Null for someone who signed up and is waiting to be let in. */
  role: Role | null
  joinedAt: string
}

export type TeamResult =
  | { ok: true; members: TeamMember[] }
  | { ok: false; error: string; members: TeamMember[] }

export type RowResult = { ok: boolean; error?: string }

const UNDEFINED_TABLE = "42P01"

const MIGRATION_HINT =
  "The profiles table does not exist yet. Run supabase/migrations/0016_roles.sql against the project."

/** Everyone who has signed up, newest waiting first, then the team by name. */
export async function listTeam(): Promise<TeamResult> {
  await requireRole("manager")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      members: [],
    }
  }

  const members = (data ?? []).map((row) => {
    const email = (row.email as string) ?? ""
    return {
      id: row.id as string,
      email,
      name: (row.full_name as string | null)?.trim() || email.split("@")[0],
      role: isRole(row.role) ? row.role : null,
      joinedAt: row.created_at as string,
    }
  })

  // Anyone waiting is what a manager opens this page for, so they lead.
  members.sort((a, b) => {
    if (!a.role !== !b.role) return a.role ? 1 : -1
    if (!a.role) return 0
    return a.name.localeCompare(b.name)
  })

  return { ok: true, members }
}

/**
 * Gives someone a role, changes it, or — with `null` — takes their access
 * away. Their login stays; they land on the pending page until let back in.
 *
 * Your own role is not changeable from here: a manager demoting themselves by
 * a stray click would lose the page they would need to undo it.
 */
export async function setMemberRole(id: string, role: Role | null): Promise<RowResult> {
  const me = await requireRole("manager")

  if (!id) return { ok: false, error: "That user is no longer listed." }
  if (id === me.id) return { ok: false, error: "You cannot change your own role." }
  if (role !== null && !isRole(role)) return { ok: false, error: "Pick a role." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", id)
    // Returning the row is what makes this real rather than assumed.
    .select("id")

  // The last-manager trigger raises a sentence meant to be shown as it is.
  if (error) {
    return { ok: false, error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }
  if (!data || data.length === 0) return { ok: false, error: "That user no longer exists." }

  refresh()
  return { ok: true }
}

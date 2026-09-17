"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { isRole, type Role } from "@/features/auth/roles"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { flash } from "@/lib/flash"

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
const FOREIGN_KEY_VIOLATION = "23503"

const MIGRATION_HINT =
  "The profiles table does not exist yet. Run supabase/migrations/0016_roles.sql against the project."

/** Everyone who has signed up, newest waiting first, then the team by name. */
export async function listTeam(): Promise<TeamResult> {
  await requirePermission("users.manage")

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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const KEY_HINT =
  "Creating users needs the Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY " +
  "to the server environment (see .env.example) and restart the app."

/**
 * Creates a login for someone and lets them straight in with the chosen role.
 *
 * The address is marked confirmed, so no email goes out and they can sign in
 * with the password given here as soon as it is passed on to them.
 *
 * The profile is written with the admin client rather than left to the
 * sign-up trigger and then updated: that way it is right even if the trigger
 * is missing, and it is one statement instead of two.
 */
export async function createMember(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("users.manage")

  const name = String(formData.get("name") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const password = String(formData.get("password") ?? "")
  const role = String(formData.get("role") ?? "")

  const fieldErrors: Record<string, string> = {}
  if (name.length > 80) fieldErrors.name = "Keep the name under 80 characters."
  if (!email) fieldErrors.email = "Email is required."
  else if (!EMAIL_PATTERN.test(email)) fieldErrors.email = "Enter a valid email address."
  // No length rule of our own: Supabase applies the project's password policy
  // and its message is passed through below.
  if (!password) fieldErrors.password = "Password is required."
  if (!isRole(role)) fieldErrors.role = "Pick a role."
  if (hasFieldErrors(fieldErrors) || !isRole(role)) return { fieldErrors }

  const admin = createAdminClient()
  if (!admin) return { error: KEY_HINT }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: name ? { full_name: name } : undefined,
  })

  if (error || !data.user) {
    if (error?.code === "email_exists") {
      return { fieldErrors: { email: "Someone has already signed up with this email." } }
    }
    if (error?.status === 401 || error?.status === 403) return { error: KEY_HINT }
    if (error?.code === "weak_password") {
      return { fieldErrors: { password: error.message } }
    }
    return { error: error?.message ?? "Could not create that user." }
  }

  const { error: profileError } = await admin.from("profiles").upsert({
    id: data.user.id,
    email,
    full_name: name || null,
    role,
  })

  if (profileError) {
    const reason = profileError.code === UNDEFINED_TABLE ? MIGRATION_HINT : profileError.message
    return {
      error: `The login for ${email} was created, but their role was not set: ${reason} Set it from the Users list.`,
    }
  }

  refresh()
  await flash("success", "User added.")
  redirect("/settings/users")
}

/**
 * Gives someone a role, changes it, or — with `null` — takes their access
 * away. Their login stays; they land on the pending page until let back in.
 *
 * Your own role is not changeable from here: a manager demoting themselves by
 * a stray click would lose the page they would need to undo it.
 */
export async function setMemberRole(id: string, role: Role | null): Promise<RowResult> {
  const me = await requirePermission("users.manage")

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
    if (error.code === FOREIGN_KEY_VIOLATION) return { ok: false, error: "That role no longer exists." }
    return { ok: false, error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }
  if (!data || data.length === 0) return { ok: false, error: "That user no longer exists." }

  refresh()
  return { ok: true }
}

const DELETE_KEY_HINT =
  "Deleting users needs the Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY " +
  "to the server environment (see .env.example) and restart the app."

/**
 * Deletes someone's login and profile for good. What they entered stays on
 * the books with no author (0026_delete_users.sql).
 *
 * Not yourself, for the same reason as `setMemberRole`, and never the last
 * manager — the database refuses that too, but with a message the auth API
 * would swallow.
 */
export async function deleteMember(id: string): Promise<RowResult> {
  const me = await requirePermission("users.manage")

  if (!id) return { ok: false, error: "That user is no longer listed." }
  if (id === me.id) return { ok: false, error: "You cannot delete yourself." }

  const admin = createAdminClient()
  if (!admin) return { ok: false, error: DELETE_KEY_HINT }

  // Before 0026 the foreign keys cascade: deleting the login would delete every
  // record they entered. Refuse rather than find out.
  const { error: migrationError } = await admin.rpc("deleting_users_keeps_records")
  if (migrationError) {
    return {
      ok: false,
      error:
        "Run supabase/migrations/0026_delete_users.sql first. Until then, deleting a " +
        "user would also delete every record they entered.",
    }
  }

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle()

  if (targetError) {
    return {
      ok: false,
      error: targetError.code === UNDEFINED_TABLE ? MIGRATION_HINT : targetError.message,
    }
  }

  if (target?.role === "manager") {
    const { count, error: countError } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "manager")
      .neq("id", id)
    if (countError) return { ok: false, error: countError.message }
    if (!count) return { ok: false, error: "There has to be at least one manager." }
  }

  const { error } = await admin.auth.admin.deleteUser(id)

  if (error) {
    if (error.status === 401 || error.status === 403) return { ok: false, error: DELETE_KEY_HINT }
    if (error.status === 404) return { ok: false, error: "That user no longer exists." }
    // The last-manager trigger's sentence does not survive the auth API.
    return { ok: false, error: error.message || "Could not delete that user." }
  }

  refresh()
  return { ok: true }
}

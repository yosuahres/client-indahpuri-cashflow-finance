import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

const KEY_HINT =
  "Deleting users needs the Supabase service role key. Add SUPABASE_SERVICE_ROLE_KEY " +
  "to the server environment (see .env.example) and restart the app."

/**
 * Deletes a login and its profile for good. What they entered stays on the
 * books with no author (0026_delete_users.sql). Never the last manager.
 *
 * No permission check of its own: not a server action, so only server code
 * reaches it, and every caller decides first who may delete whom.
 */
export async function deleteLogin(id: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()
  if (!admin) return { ok: false, error: KEY_HINT }

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
  if (targetError) return { ok: false, error: targetError.message }

  // The database refuses this too, but its sentence does not survive the auth API.
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
    if (error.status === 401 || error.status === 403) return { ok: false, error: KEY_HINT }
    if (error.status === 404) return { ok: false, error: "That user no longer exists." }
    return { ok: false, error: error.message || "Could not delete that user." }
  }

  return { ok: true }
}

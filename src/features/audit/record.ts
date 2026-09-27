import "server-only"

import type { createClient } from "@/lib/supabase/server"

type Client = Awaited<ReturnType<typeof createClient>>

/** Events the database cannot see for itself (0030_audit_log.sql §5). */
export type AuditEvent = "auth.sign_in" | "auth.sign_out"

/**
 * Notes a sign-in or sign-out against whoever the client is signed in as.
 * Never fails the caller: losing an audit line must not lock anyone out, and
 * before 0030 has run there is nowhere to write it.
 */
export async function recordAuditEvent(supabase: Client, event: AuditEvent) {
  try {
    await supabase.rpc("record_audit_event", { event_name: event })
  } catch {
    // The rpc reports failure in its result; this only catches a dropped connection.
  }
}

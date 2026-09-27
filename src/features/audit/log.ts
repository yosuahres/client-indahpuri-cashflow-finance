import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"

import { AUDIT_UTC_OFFSET, type AuditEntry } from "./constants"
import type { AuditQuery } from "./query"

const UNDEFINED_TABLE = "42P01"
/** PostgREST's "relation not in the schema cache" — the same, seen from the API. */
const UNKNOWN_RELATION = "PGRST205"

const MIGRATION_HINT =
  "The audit log does not exist yet. Run supabase/migrations/0030_audit_log.sql against the project."

const COLUMNS =
  "id, occurred_at, actor_id, actor_email, actor_role, event, resource, resource_id, action, ip_address, changes"

/** PostgREST caps a single read; the export walks the log in steps this big. */
const BATCH = 1000

export type AuditPage =
  | { ok: true; entries: AuditEntry[]; hasMore: boolean }
  | { ok: false; error: string; entries: AuditEntry[]; hasMore: false }

/** The day after `YYYY-MM-DD`, so "to" takes in the whole of its day. */
function nextDay(value: string) {
  const day = new Date(`${value}T00:00:00Z`)
  day.setUTCDate(day.getUTCDate() + 1)
  return day.toISOString().slice(0, 10)
}

/**
 * The search box goes into a PostgREST `or=(…)` filter, where commas,
 * parentheses and wildcards mean something. They are dropped rather than
 * escaped: nobody searches the log for them.
 */
function searchable(term: string) {
  return term.replace(/[,()*%\\"]/g, " ").trim()
}

type Client = Awaited<ReturnType<typeof createClient>>

/**
 * The filters, not yet run. Not async: a query builder is a thenable, so
 * returning it from a promise would run it before the range is set.
 */
function filtered(supabase: Client, query: AuditQuery) {
  let request = supabase
    .from("audit_log")
    .select(COLUMNS)
    .order("occurred_at", { ascending: false })
    .order("id", { ascending: false })

  if (query.resource) request = request.eq("resource", query.resource)
  if (query.action) request = request.eq("action", query.action)
  if (query.role) request = request.eq("actor_role", query.role)
  if (query.from) request = request.gte("occurred_at", `${query.from}T00:00:00${AUDIT_UTC_OFFSET}`)
  if (query.to) request = request.lt("occurred_at", `${nextDay(query.to)}T00:00:00${AUDIT_UTC_OFFSET}`)

  const user = searchable(query.user)
  if (user) request = request.ilike("actor_email", `%${user}%`)

  const term = searchable(query.q)
  if (term) {
    request = request.or(
      ["actor_email", "event", "resource_id", "ip_address"]
        .map((column) => `${column}.ilike.*${term}*`)
        .join(","),
    )
  }

  return request
}

function toEntry(row: Record<string, unknown>): AuditEntry {
  const changes = row.changes
  return {
    id: Number(row.id),
    occurredAt: String(row.occurred_at),
    actorId: (row.actor_id as string | null) ?? null,
    actorEmail: (row.actor_email as string | null) ?? null,
    actorRole: (row.actor_role as string | null) ?? null,
    event: String(row.event),
    resource: String(row.resource),
    resourceId: (row.resource_id as string | null) ?? null,
    action: String(row.action),
    ipAddress: (row.ip_address as string | null) ?? null,
    changes:
      changes && typeof changes === "object" && !Array.isArray(changes)
        ? (changes as Record<string, unknown>)
        : null,
  }
}

function failure(error: { code?: string; message: string }): AuditPage {
  const missing = error.code === UNDEFINED_TABLE || error.code === UNKNOWN_RELATION
  return { ok: false, error: missing ? MIGRATION_HINT : error.message, entries: [], hasMore: false }
}

/** One page of the log, newest first. */
export async function listAuditLog(query: AuditQuery, pageSize: number): Promise<AuditPage> {
  await requirePermission("audit.view")

  const supabase = await createClient()
  const start = (query.page - 1) * pageSize
  // One row past the page says whether there is another, without a count.
  const { data, error } = await filtered(supabase, query).range(start, start + pageSize)
  if (error) return failure(error)

  const rows = (data ?? []) as Record<string, unknown>[]
  return { ok: true, entries: rows.slice(0, pageSize).map(toEntry), hasMore: rows.length > pageSize }
}

/** Everything the filters match, newest first, up to `limit` rows. */
export async function exportAuditLog(query: AuditQuery, limit: number): Promise<AuditPage> {
  await requirePermission("audit.view")

  const supabase = await createClient()
  const entries: AuditEntry[] = []
  while (entries.length < limit) {
    const start = entries.length
    const end = Math.min(start + BATCH, limit) - 1
    const { data, error } = await filtered(supabase, query).range(start, end)
    if (error) return failure(error)

    const rows = (data ?? []) as Record<string, unknown>[]
    entries.push(...rows.map(toEntry))
    if (rows.length < end - start + 1) break
  }

  return { ok: true, entries, hasMore: false }
}

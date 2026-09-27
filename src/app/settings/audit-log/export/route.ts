import { requirePermission } from "@/features/auth/session"
import {
  actionLabel,
  AUDIT_EXPORT_LIMIT,
  formatAuditTime,
  resourceLabel,
  type AuditEntry,
} from "@/features/audit/constants"
import { exportAuditLog } from "@/features/audit/log"
import { readAuditQuery } from "@/features/audit/query"
import { listRoles } from "@/features/roles/actions"

const HEADER = [
  "Time (WIB)",
  "User",
  "Role",
  "Event",
  "Resource",
  "ID",
  "Action",
  "IP Address",
  "Changes",
]

/**
 * One CSV field. Quoted when it must be, and a leading =, +, - or @ is
 * defused so a spreadsheet never runs a changed value as a formula.
 */
function field(value: string | null | undefined) {
  let text = value ?? ""
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function row(entry: AuditEntry) {
  return [
    formatAuditTime(entry.occurredAt),
    entry.actorEmail ?? "System",
    entry.actorRole,
    entry.event,
    resourceLabel(entry.resource),
    entry.resourceId,
    actionLabel(entry.action),
    entry.ipAddress,
    entry.changes ? JSON.stringify(entry.changes) : "",
  ]
    .map(field)
    .join(",")
}

export async function GET(request: Request) {
  // Route handlers are not covered by the page DAL, so re-verify here.
  await requirePermission("audit.view")

  const url = new URL(request.url)
  const { roles } = await listRoles()
  const query = readAuditQuery(
    Object.fromEntries(url.searchParams),
    roles.map((role) => role.key),
  )

  const result = await exportAuditLog(query, AUDIT_EXPORT_LIMIT)
  if (!result.ok) return new Response(result.error, { status: 500 })

  // The byte-order mark tells Excel the file is UTF-8.
  const csv = "﻿" + [HEADER.join(","), ...result.entries.map(row)].join("\r\n") + "\r\n"
  const stamp = new Date().toISOString().slice(0, 10)
  const range = query.from || query.to ? `-${query.from || "start"}-to-${query.to || stamp}` : ""

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="audit-log${range}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}

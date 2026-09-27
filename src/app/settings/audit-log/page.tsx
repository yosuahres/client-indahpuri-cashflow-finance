import type { Metadata } from "next"
import { Download } from "lucide-react"

import { SettingsPage } from "@/components/layout/settings-page"
import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { AuditList } from "@/features/audit/components/audit-list"
import { AUDIT_PAGE_SIZE } from "@/features/audit/constants"
import { listAuditLog } from "@/features/audit/log"
import { auditSearchParams, readAuditQuery } from "@/features/audit/query"
import { requirePermission } from "@/features/auth/session"
import { listRoles } from "@/features/roles/actions"

export const metadata: Metadata = {
  title: "Audit Log · Settings",
}

export default async function SettingsAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("audit.view")
  const [params, { roles }] = await Promise.all([searchParams, listRoles()])
  const query = readAuditQuery(
    params,
    roles.map((role) => role.key),
  )
  const result = await listAuditLog(query, AUDIT_PAGE_SIZE)
  const today = new Date().toISOString().slice(0, 10)
  const exportQuery = auditSearchParams(query).toString()

  return (
    <>
      <Topbar
        title="Audit Log"
        section="Settings"
        actions={
          <a
            href={`/settings/audit-log/export${exportQuery ? `?${exportQuery}` : ""}`}
            aria-label="Export CSV"
            className={TOPBAR_ACTION_CLASS}
          >
            <Download className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Export CSV</span>
          </a>
        }
      />

      <SettingsPage title="Audit Log" description="Who changed what, when, and from where.">
        <AuditList
          entries={result.entries}
          roles={roles}
          query={query}
          hasMore={result.hasMore}
          pageSize={AUDIT_PAGE_SIZE}
          today={today}
          notice={result.ok ? undefined : result.error}
        />
      </SettingsPage>
    </>
  )
}

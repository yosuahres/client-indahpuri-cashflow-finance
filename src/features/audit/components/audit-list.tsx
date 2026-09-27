"use client"

import type { ReactNode } from "react"
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileDiff,
  Fingerprint,
  Globe,
  Layers,
  ShieldCheck,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react"

import { ColumnMenu } from "@/components/table/column-menu"
import { Avatar, PagerLink, SortHeader } from "@/components/table/data-table"
import { BODY_ROW, CELL, HEAD_ROW, TABLE, TABLE_FRAME } from "@/components/table/styles"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"
import type { RoleSummary } from "@/features/auth/roles"
import { cn } from "@/lib/cn"

import {
  actionLabel,
  AUDIT_ACTIONS,
  AUDIT_COLUMNS,
  AUDIT_COLUMNS_STORAGE_KEY,
  AUDIT_RESOURCES,
  DEFAULT_AUDIT_COLUMNS,
  describeEntry,
  formatAuditTime,
  resourceLabel,
  type AuditColumnKey,
  type AuditEntry,
} from "../constants"
import { auditSearchParams, type AuditQuery } from "../query"

const cell = cn(CELL, "align-top")

const ICONS: Record<AuditColumnKey, LucideIcon> = {
  user: UserRound,
  event: Activity,
  resource: Layers,
  resourceId: Fingerprint,
  action: Zap,
  role: ShieldCheck,
  ip: Globe,
  changes: FileDiff,
}

const badge = "inline-flex items-center gap-1 rounded-md border px-1.5 text-xs leading-5 font-medium whitespace-nowrap"

const WIDTHS = Object.fromEntries(
  AUDIT_COLUMNS.map((column) => [column.key, column.width]),
) as Record<AuditColumnKey, string>

const LABELS = Object.fromEntries(
  AUDIT_COLUMNS.map((column) => [column.key, column.label]),
) as Record<AuditColumnKey, string>

const ACTION_TONES: Record<string, string> = {
  create: "border-emerald-200 bg-emerald-50 text-emerald-700",
  update: "border-sky-200 bg-sky-50 text-sky-700",
  delete: "border-rose-200 bg-rose-50 text-rose-700",
}

/** The log and the controls above it, laid out as every list here is. */
export function AuditList({
  entries,
  roles,
  query,
  hasMore,
  pageSize,
  today,
  notice,
}: {
  entries: AuditEntry[]
  roles: RoleSummary[]
  query: AuditQuery
  hasMore: boolean
  pageSize: number
  today: string
  /** Shown above the rows when the log could not be read. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    AUDIT_COLUMNS_STORAGE_KEY,
    AUDIT_COLUMNS,
    DEFAULT_AUDIT_COLUMNS,
  )

  const roleName = (key: string | null) =>
    key ? (roles.find((role) => role.key === key)?.name ?? key) : ""

  function pageHref(page: number) {
    const params = auditSearchParams(query)
    if (page > 1) params.set("page", String(page))
    const search = params.toString()
    return search ? `?${search}` : "?"
  }

  function cells(entry: AuditEntry): Record<AuditColumnKey, ReactNode> {
    return {
      user: entry.actorEmail ? (
        <span className="text-neutral-900">{entry.actorEmail}</span>
      ) : (
        <span className="text-neutral-500">System</span>
      ),
      event: <EventLine entry={entry} />,
      resource: <span className="font-medium text-neutral-900">{resourceLabel(entry.resource)}</span>,
      resourceId: entry.resourceId ? (
        <code
          className="block max-w-[160px] truncate font-mono text-xs text-neutral-600"
          title={entry.resourceId}
        >
          {entry.resourceId}
        </code>
      ) : (
        <span className="text-neutral-400">—</span>
      ),
      action: (
        <span
          className={cn(
            badge,
            ACTION_TONES[entry.action] ?? "border-black/10 bg-neutral-50 text-neutral-700",
          )}
        >
          {actionLabel(entry.action)}
        </span>
      ),
      role: entry.actorRole ? (
        <span className={cn(badge, "border-amber-200 bg-amber-50 text-amber-700")}>
          <ShieldCheck className="size-3.5 shrink-0" strokeWidth={2} />
          {roleName(entry.actorRole)}
        </span>
      ) : (
        <span className="text-neutral-400">—</span>
      ),
      ip: entry.ipAddress ? (
        <code className="font-mono text-xs text-neutral-600">{entry.ipAddress}</code>
      ) : (
        <span className="text-neutral-400">—</span>
      ),
      changes: <Changes entry={entry} />,
    }
  }

  const first = entries.length === 0 ? 0 : (query.page - 1) * pageSize + 1
  const last = (query.page - 1) * pageSize + entries.length

  return (
    <>
      <TableToolbar
        title="All activity"
        search={query.q}
        searchLabel="Search the audit log"
        searchPlaceholder="Search email, event, ID or IP"
        filters={[
          {
            key: "resource",
            label: "Resource",
            allLabel: "All resources",
            value: query.resource,
            options: AUDIT_RESOURCES.map((entry) => ({ value: entry.value, label: entry.label })),
          },
          {
            key: "action",
            label: "Action",
            allLabel: "All actions",
            value: query.action,
            options: AUDIT_ACTIONS.map((entry) => ({ value: entry.value, label: entry.label })),
          },
          {
            key: "role",
            label: "Role",
            allLabel: "All roles",
            value: query.role,
            options: roles.map((role) => ({ value: role.key, label: role.name })),
          },
          { key: "user", label: "User email", kind: "text", value: query.user, placeholder: "name@example.com" },
          { key: "from", label: "From", kind: "date", value: query.from, today },
          { key: "to", label: "To", kind: "date", value: query.to, today },
        ]}
      >
        <ColumnMenu
          all={AUDIT_COLUMNS}
          defaults={DEFAULT_AUDIT_COLUMNS}
          columns={columns}
          onChange={setColumns}
        />
      </TableToolbar>

      <div className={TABLE_FRAME}>
        {notice ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {notice}
          </p>
        ) : null}

        <div className="overflow-x-auto">
          <table className={TABLE}>
            <caption className="sr-only">Every change made, newest first.</caption>
            <thead>
              <tr className={HEAD_ROW}>
                <SortHeader label="Time" icon={Clock} className="min-w-[180px]" />
                {columns.map((key) => (
                  <SortHeader key={key} label={LABELS[key]} icon={ICONS[key]} className={WIDTHS[key]} />
                ))}
              </tr>
            </thead>

            <tbody>
              {entries.map((entry) => {
                const rowCells = cells(entry)
                return (
                  <tr key={entry.id} className={BODY_ROW}>
                    <td className={cn(cell, "whitespace-nowrap tabular-nums")}>
                      <time dateTime={entry.occurredAt}>{formatAuditTime(entry.occurredAt)}</time>
                    </td>
                    {columns.map((key) => (
                      <td key={key} className={cell}>
                        {rowCells[key]}
                      </td>
                    ))}
                  </tr>
                )
              })}

              {entries.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-3 py-6 text-center text-neutral-500">
                    {query.page > 1
                      ? "No older entries on this page."
                      : "Nothing recorded matches these filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <nav
          aria-label="Pages"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-black/12 px-3 py-2 text-sm text-neutral-500"
        >
          <span className="tabular-nums">
            {first}–{last}
            {hasMore ? " · newest first" : ` of ${last}`}
          </span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">Page {query.page}</span>
            <PagerLink href={pageHref(query.page - 1)} disabled={query.page <= 1} label="Newer entries">
              <ChevronLeft className="size-4" strokeWidth={1.75} />
            </PagerLink>
            <PagerLink href={pageHref(query.page + 1)} disabled={!hasMore} label="Older entries">
              <ChevronRight className="size-4" strokeWidth={1.75} />
            </PagerLink>
          </div>
        </nav>
      </div>
    </>
  )
}

/** Who did it, and what, in words: "yosuahres updated Transactions". */
function EventLine({ entry }: { entry: AuditEntry }) {
  const { actor, rest } = describeEntry(entry)
  return (
    <span className="flex items-center gap-2.5" title={entry.event}>
      <Avatar name={actor} />
      <span className="min-w-0">
        <span className="font-medium text-neutral-900">{actor}</span> {rest}
      </span>
    </span>
  )
}

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—"
  return typeof value === "string" ? value : JSON.stringify(value)
}

/**
 * What changed, folded away until asked for. An update lists each field that
 * moved; a create or delete lists the whole record.
 */
function Changes({ entry }: { entry: AuditEntry }) {
  if (!entry.changes) return <span className="text-neutral-400">—</span>

  const fields = Object.entries(entry.changes)
  const isUpdate = entry.action === "update"
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-medium text-neutral-600 select-none hover:text-neutral-900">
        {fields.length} {fields.length === 1 ? "field" : "fields"}
      </summary>
      <dl className="mt-1.5 max-w-[360px] space-y-1 text-xs">
        {fields.map(([field, value]) => {
          const pair = isUpdate && Array.isArray(value) && value.length === 2 ? value : null
          return (
            <div key={field} className="break-words">
              <dt className="inline font-mono text-neutral-500">{field}: </dt>
              <dd className="inline text-neutral-800">
                {pair ? (
                  <>
                    <span className="text-rose-700 line-through">{display(pair[0])}</span>
                    {" → "}
                    <span className="text-emerald-700">{display(pair[1])}</span>
                  </>
                ) : (
                  display(value)
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </details>
  )
}

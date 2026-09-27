import type { TableColumn } from "@/components/table/columns"

/**
 * What the audit log records (supabase/migrations/0030_audit_log.sql). Keep the
 * resources in step with the tables its trigger is attached to.
 */
export const AUDIT_RESOURCES = [
  { value: "transactions", label: "Transactions" },
  { value: "budgets", label: "Budgets" },
  { value: "categories", label: "Categories" },
  { value: "accounts", label: "Accounts" },
  { value: "employees", label: "Employees" },
  { value: "departments", label: "Departments" },
  { value: "attendance", label: "Attendance" },
  { value: "shifts", label: "Shifts" },
  { value: "leave_requests", label: "Leave" },
  { value: "leave_types", label: "Leave types" },
  { value: "leave_periods", label: "Leave periods" },
  { value: "leave_policies", label: "Leave policies" },
  { value: "leave_policy_details", label: "Leave policy details" },
  { value: "leave_policy_assignments", label: "Leave policy assignments" },
  { value: "leave_allocations", label: "Leave allocations" },
  { value: "payroll_runs", label: "Payroll" },
  { value: "payslips", label: "Payslips" },
  { value: "payroll_settings", label: "Payroll settings" },
  { value: "profiles", label: "Users" },
  { value: "roles", label: "Roles" },
  { value: "role_permissions", label: "Permissions" },
  { value: "auth", label: "Sign-in" },
] as const

export const AUDIT_ACTIONS = [
  { value: "create", label: "Create" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
  { value: "sign_in", label: "Sign in" },
  { value: "sign_out", label: "Sign out" },
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]["value"]

export function resourceLabel(value: string) {
  return AUDIT_RESOURCES.find((entry) => entry.value === value)?.label ?? value
}

const VERBS: Record<string, string> = {
  create: "created",
  update: "updated",
  delete: "deleted",
  sign_in: "signed in",
  sign_out: "signed out",
}

/** "yosuahres updated Transactions", "yosuahres signed in". */
export function describeEntry(entry: { actorEmail: string | null; action: string; resource: string }) {
  const actor = entry.actorEmail ? entry.actorEmail.split("@")[0] : "System"
  const verb = VERBS[entry.action] ?? entry.action
  const what = entry.resource === "auth" ? "" : resourceLabel(entry.resource)
  return { actor, rest: what ? `${verb} ${what}` : verb }
}

export function actionLabel(value: string) {
  return AUDIT_ACTIONS.find((entry) => entry.value === value)?.label ?? value
}

/** One row of the log, as the app reads it. */
export type AuditEntry = {
  id: number
  occurredAt: string
  actorId: string | null
  actorEmail: string | null
  actorRole: string | null
  event: string
  resource: string
  resourceId: string | null
  action: string
  ipAddress: string | null
  /** For an update, `{ field: [before, after] }`; otherwise the whole row. */
  changes: Record<string, unknown> | null
}

/** The business runs on Jakarta time, whatever the server's clock says. */
export const AUDIT_TIME_ZONE = "Asia/Jakarta"
export const AUDIT_UTC_OFFSET = "+07:00"

const stamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: AUDIT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

/** "2026-09-27 14:05:12", Jakarta time: sortable, and what the CSV carries. */
export function formatAuditTime(value: string) {
  const parts = Object.fromEntries(
    stamp.formatToParts(new Date(value)).map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`
}

/** The table's optional columns. The time names the row, so it always shows. */
export type AuditColumnKey =
  | "user"
  | "event"
  | "resource"
  | "resourceId"
  | "action"
  | "role"
  | "ip"
  | "changes"

export const AUDIT_COLUMNS: TableColumn<AuditColumnKey>[] = [
  { key: "user", label: "User", width: "min-w-[200px]" },
  { key: "event", label: "Event", width: "min-w-[280px]" },
  { key: "resource", label: "Resource", width: "min-w-[130px]" },
  { key: "resourceId", label: "ID", width: "min-w-[120px]" },
  { key: "action", label: "Action", width: "min-w-[90px]" },
  { key: "role", label: "Role", width: "min-w-[100px]" },
  { key: "ip", label: "IP address", width: "min-w-[140px]" },
  { key: "changes", label: "Changes", width: "min-w-[220px]" },
]

/** Who did it reads in the Event line, so the User column starts hidden. */
export const DEFAULT_AUDIT_COLUMNS: AuditColumnKey[] = AUDIT_COLUMNS.map((column) => column.key).filter(
  (key) => key !== "user",
)

/** Where the chosen columns and their order are remembered, per browser. */
export const AUDIT_COLUMNS_STORAGE_KEY = "settings.audit.columns.v2"

/** Rows per page on screen. The export takes everything the filters match. */
export const AUDIT_PAGE_SIZE = 100

/** The most rows one export will write, so a careless click cannot run forever. */
export const AUDIT_EXPORT_LIMIT = 50_000

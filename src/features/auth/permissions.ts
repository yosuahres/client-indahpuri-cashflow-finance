/**
 * What each role may do. The grid itself lives in the database
 * (supabase/migrations/0024_role_permissions.sql) and is ticked in
 * Settings → Permissions; this file names the ticks and says which page each
 * one opens.
 *
 * These checks decide what is shown; row level security, asking the same grid,
 * decides what is allowed.
 */
import type { TransactionKind } from "@/lib/finance"

import { MANAGER, type Role } from "./roles"

export const PERMISSION_GROUPS = [
  {
    key: "reports",
    label: "Financial reports",
    permissions: [
      { key: "reports.view", label: "View Laporan Keuangan" },
      { key: "profit_loss.view", label: "View Profit and Loss" },
      { key: "budgets.view", label: "View Anggaran" },
    ],
  },
  {
    key: "transactions",
    label: "Transactions",
    permissions: [
      { key: "transactions.income", label: "Input income" },
      { key: "transactions.expense", label: "Input expenses" },
      { key: "transactions.edit", label: "Edit, settle and delete transactions" },
    ],
  },
  {
    key: "setup",
    label: "Finance setup",
    permissions: [
      { key: "budgets.manage", label: "Plan budgets" },
      { key: "accounts.manage", label: "Manage accounts" },
      { key: "categories.manage", label: "Manage categories" },
    ],
  },
  {
    key: "users",
    label: "User management",
    permissions: [{ key: "users.manage", label: "Manage users, roles and permissions" }],
  },
] as const

export type PermissionGroupKey = (typeof PERMISSION_GROUPS)[number]["key"]
export type Permission = (typeof PERMISSION_GROUPS)[number]["permissions"][number]["key"]

export const PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key),
)

export function isPermission(value: unknown): value is Permission {
  return PERMISSIONS.includes(value as Permission)
}

export function permissionLabel(permission: Permission): string {
  for (const group of PERMISSION_GROUPS) {
    for (const entry of group.permissions) if (entry.key === permission) return entry.label
  }
  return permission
}

/** Ticks that cannot be taken off, so someone can always put the grid right. */
export function isLocked(role: Role, permission: Permission): boolean {
  return role === MANAGER && permission === "users.manage"
}

/**
 * The grid before 0024 has run: what managers and admins could do when roles
 * were fixed in code.
 */
export const DEFAULT_GRANTS: Record<string, Permission[]> = {
  manager: PERMISSIONS,
  admin: ["reports.view"],
}

export function can(permissions: readonly Permission[], permission: Permission): boolean {
  return permissions.includes(permission)
}

/** The kinds of transaction someone may enter, in the order the form offers them. */
export function entryKinds(permissions: readonly Permission[]): TransactionKind[] {
  const kinds: TransactionKind[] = []
  if (can(permissions, "transactions.income")) kinds.push("income")
  if (can(permissions, "transactions.expense")) kinds.push("expense")
  return kinds
}

/**
 * The permission each page asks for, most specific first. A path under none of
 * these is open to anyone with a role — the dashboard.
 */
const ROUTES: { prefix: string; allowed: (permissions: readonly Permission[]) => boolean }[] = [
  { prefix: "/transactions/new", allowed: (p) => entryKinds(p).length > 0 },
  { prefix: "/reporting", allowed: (p) => can(p, "reports.view") },
  { prefix: "/profit-and-loss", allowed: (p) => can(p, "profit_loss.view") },
  { prefix: "/budgets/new", allowed: (p) => can(p, "budgets.manage") },
  { prefix: "/budgets", allowed: (p) => can(p, "budgets.view") },
  { prefix: "/accounts", allowed: (p) => can(p, "accounts.manage") },
  { prefix: "/settings", allowed: (p) => can(p, "users.manage") },
]

export function canVisit(role: Role | null, permissions: readonly Permission[], href: string): boolean {
  if (!role) return false

  const path = href.split("?")[0]
  const route = ROUTES.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`))
  return route ? route.allowed(permissions) : true
}

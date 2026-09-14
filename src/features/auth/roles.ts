/**
 * Who may open what. Shared by the server guards and the sidebar, so a page
 * someone cannot open is never offered to them either.
 *
 * The database enforces the same split on its own (supabase/migrations/
 * 0016_roles.sql): these checks decide what is shown, row level security
 * decides what is allowed.
 */
export type Role = "manager" | "admin"

export const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: "manager",
    label: "Manager",
    description: "Everything, including users",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Dashboard and Laporan Keuangan, read-only",
  },
]

export function isRole(value: unknown): value is Role {
  return ROLES.some((role) => role.value === value)
}

export function roleLabel(role: Role | null): string {
  return ROLES.find((entry) => entry.value === role)?.label ?? "No access"
}

/** Everything an admin can open. Managers can open every page. */
const ADMIN_ROUTES = ["/dashboard", "/reporting"]

export function canVisit(role: Role | null, href: string): boolean {
  if (role === "manager") return true
  if (role !== "admin") return false

  const path = href.split("?")[0]
  return ADMIN_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))
}

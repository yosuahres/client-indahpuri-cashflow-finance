/**
 * Roles are rows in the database (supabase/migrations/0025_custom_roles.sql),
 * added and named in Settings → Roles. A role is referred to by its key; what
 * it may do is in permissions.ts.
 */
export type Role = string

export type RoleSummary = {
  key: Role
  name: string
  description: string
  /** Built-in roles cannot be deleted. */
  builtIn: boolean
}

/** The role the app itself leans on: never deleted, always manages users. */
export const MANAGER: Role = "manager"

/** The roles before 0025 has run, when they were fixed in code. */
export const FALLBACK_ROLES: RoleSummary[] = [
  { key: "manager", name: "Manager", description: "Runs the books and the team", builtIn: true },
  { key: "admin", name: "Admin", description: "Day-to-day finance work", builtIn: false },
]

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && value.length > 0
}

/** "Front Office" → "front_office": what a new role is keyed by. */
export function roleKeyFrom(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 36)
  return /^[a-z]/.test(slug) ? slug : `role_${slug}`.slice(0, 36)
}

import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import {
  can,
  DEFAULT_GRANTS,
  entryKinds,
  isPermission,
  type Permission,
} from "./permissions"
import { FALLBACK_ROLES, isRole, type Role } from "./roles"

/** PostgREST code for "no such function" — 0024_role_permissions.sql has not run. */
const UNDEFINED_FUNCTION = "PGRST202"

/** PostgREST code for "no relationship between these tables" — 0025 has not run. */
const UNDEFINED_RELATIONSHIP = "PGRST200"

/** What the app actually reads off the signed-in user. */
export type SessionUser = {
  id: string
  email: string
  name: string
  /** Null until a manager lets them in. */
  role: Role | null
  /** The role's display name, as set in Settings → Roles. */
  roleName: string | null
  /** Everything their role is ticked for in Settings → Permissions. */
  permissions: Permission[]
}

/**
 * Data Access Layer for the current user.
 *
 * The proxy only does an optimistic cookie check, so anything that reads or
 * mutates user data must go through here. `cache` dedupes the call across a
 * single render pass.
 *
 * Claims rather than `getUser()`: both verify the token before trusting it,
 * but `getClaims()` can do it locally against the project's public JWKS, which
 * it caches — no call to the auth server, so a navigation costs one less round
 * trip. On a project still signing with the legacy shared secret there is no
 * public key to check against and the SDK falls back to the network call, the
 * same one `getUser()` made; switching the project to asymmetric JWT signing
 * keys is what collects the saving.
 *
 * The role is read from `profiles` on every request rather than baked into the
 * token, so taking someone's access away holds from their very next click
 * instead of whenever their token next refreshes.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  const claims = data?.claims
  if (error || !claims?.sub) return null

  const email = claims.email ?? ""
  const fullName = claims.user_metadata?.full_name

  // Both at once: the permissions are looked up through the profile on the
  // database side, so neither waits for the other.
  const [profileResult, { data: granted, error: grantError }] = await Promise.all([
    supabase.from("profiles").select("role, roles(name)").eq("id", claims.sub).maybeSingle(),
    supabase.rpc("my_permissions"),
  ])

  // Before 0025 there is no roles table to take the name from. That should
  // cost the badge its name, not everyone their access.
  let profile: { role?: unknown; roles?: unknown } | null = profileResult.data
  if (profileResult.error?.code === UNDEFINED_RELATIONSHIP) {
    const { data } = await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle()
    profile = data
  }

  // Fails closed: if the role cannot be read for any reason — the lookup
  // errored, the profile is missing — the user waits on the pending page
  // rather than being handed access.
  const role: Role | null = isRole(profile?.role) ? profile.role : null
  const joined = profile?.roles as { name?: unknown } | { name?: unknown }[] | null | undefined
  const joinedName = Array.isArray(joined) ? joined[0]?.name : joined?.name
  const roleName = !role
    ? null
    : typeof joinedName === "string"
      ? joinedName
      : (FALLBACK_ROLES.find((entry) => entry.key === role)?.name ?? role)

  // Before 0024 has run there is no grid to read, so roles keep what they could
  // do before it. Any other failure grants nothing.
  let permissions: Permission[] = []
  if (role && grantError?.code === UNDEFINED_FUNCTION) permissions = DEFAULT_GRANTS[role] ?? []
  else if (role && Array.isArray(granted)) permissions = granted.filter(isPermission)

  return {
    id: claims.sub,
    email,
    name: (typeof fullName === "string" ? fullName : "") || email.split("@")[0],
    role,
    roleName,
    permissions,
  }
})

/**
 * Signed in and let in. Anonymous visitors go to the login page; accounts no
 * manager has given a role yet go to wait on the pending page.
 */
export const requireUser = cache(async (): Promise<SessionUser & { role: Role }> => {
  const user = await getUser()
  if (!user) redirect("/login")
  if (!user.role) redirect("/pending")
  return { ...user, role: user.role }
})

/**
 * Only for someone whose role is ticked for this permission. Anyone else
 * signed in is sent to the dashboard, which every role can open.
 */
export async function requirePermission(permission: Permission) {
  const user = await requireUser()
  if (!can(user.permissions, permission)) redirect("/dashboard")
  return user
}

/**
 * Someone who may enter at least one kind of transaction, with the kinds they
 * may enter. Anyone else is sent to the dashboard.
 */
export async function requireEntry() {
  const user = await requireUser()
  const kinds = entryKinds(user.permissions)
  if (kinds.length === 0) redirect("/dashboard")
  return { ...user, kinds }
}

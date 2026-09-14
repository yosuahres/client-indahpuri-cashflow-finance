import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

import { isRole, type Role } from "./roles"

/** What the app actually reads off the signed-in user. */
export type SessionUser = {
  id: string
  email: string
  name: string
  /** Null until a manager lets them in. */
  role: Role | null
}

/** Postgres "relation does not exist" — the roles migration has not been run. */
const UNDEFINED_TABLE = "42P01"

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", claims.sub)
    .maybeSingle()

  // Before the roles migration every user ran their own books with full
  // access, so that is what they keep until it is run. Nobody can have been
  // made an admin without it.
  const role: Role | null =
    profileError?.code === UNDEFINED_TABLE
      ? "manager"
      : isRole(profile?.role)
        ? profile.role
        : null

  return {
    id: claims.sub,
    email,
    name: (typeof fullName === "string" ? fullName : "") || email.split("@")[0],
    role,
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
 * Only for the given role. Anyone else signed in is sent to the dashboard,
 * which every role can open.
 */
export async function requireRole(role: Role): Promise<SessionUser & { role: Role }> {
  const user = await requireUser()
  if (user.role !== role) redirect("/dashboard")
  return user
}

import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

/** What the app actually reads off the signed-in user. */
export type SessionUser = {
  id: string
  email: string
  name: string
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
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()

  const claims = data?.claims
  if (error || !claims?.sub) return null

  const email = claims.email ?? ""
  const fullName = claims.user_metadata?.full_name

  return {
    id: claims.sub,
    email,
    name: (typeof fullName === "string" ? fullName : "") || email.split("@")[0],
  }
})

/** Same as `getUser`, but sends anonymous visitors to the login page. */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getUser()
  if (!user) redirect("/login")
  return user
})

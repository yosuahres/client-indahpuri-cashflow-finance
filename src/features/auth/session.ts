import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"

/**
 * Data Access Layer for the current user.
 *
 * The proxy only does an optimistic cookie check, so anything that reads or
 * mutates user data must go through here. `cache` dedupes the call across a
 * single render pass.
 */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
})

/** Same as `getUser`, but sends anonymous visitors to the login page. */
export const requireUser = cache(async (): Promise<User> => {
  const user = await getUser()
  if (!user) redirect("/login")
  return user
})

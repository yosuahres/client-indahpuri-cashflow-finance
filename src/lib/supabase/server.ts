import "server-only"

import { cache } from "react"
import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { env } from "@/lib/env"

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * A new client must be created per request — never hoist this into a module
 * level constant, or one request's session leaks into another's. `cache` keeps
 * it to exactly one per request: React memoizes the call for the life of the
 * render, so every caller shares a client instead of building its own.
 *
 * Sharing is what makes concurrent queries safe. Two clients each holding
 * their own copy of the session can both decide the access token needs
 * refreshing and race; one client serializes that refresh behind its own lock,
 * so callers are free to `Promise.all` their queries rather than paying a
 * round trip each, one after another.
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Server Components cannot write cookies. The proxy refreshes the
          // session on every request, so this is safe to swallow.
        }
      },
    },
  })
})

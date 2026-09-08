import "server-only"

import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"

import { env } from "@/lib/env"

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * A new client must be created per request — never hoist this into a module
 * level constant, or one request's session leaks into another's.
 */
export async function createClient() {
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
}

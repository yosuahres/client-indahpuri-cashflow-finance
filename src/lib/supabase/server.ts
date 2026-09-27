import "server-only"

import { cache } from "react"
import { cookies, headers } from "next/headers"
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
  const [cookieStore, requestHeaders] = await Promise.all([cookies(), headers()])

  return createServerClient(env.supabaseUrl, env.supabaseKey, {
    // Every request reaches Supabase from this server, so the database would
    // only ever see the server's address. The audit log (0030) records the
    // browser's instead.
    global: { headers: clientIpHeader(requestHeaders) },
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

/** The visitor's address as the host saw it: the first hop of the forwarded chain. */
function clientIpHeader(requestHeaders: Headers): Record<string, string> {
  const ip =
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip")?.trim()
  return ip ? { "x-client-ip": ip } : {}
}

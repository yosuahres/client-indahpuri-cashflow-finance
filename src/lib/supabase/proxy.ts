import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import type { JwtPayload } from "@supabase/supabase-js"

import { env } from "@/lib/env"

/**
 * Refreshes the Supabase session for an incoming request and returns the
 * response carrying any rotated auth cookies, plus the verified JWT claims.
 *
 * Rules this has to respect (getting them wrong causes random logouts):
 *  - Write refreshed cookies onto *both* the request (so the render sees them)
 *    and the response (so the browser stores them).
 *  - Read the session immediately, before any response is streamed.
 *  - Return the very response object the cookies were written to.
 */
export async function updateSession(request: NextRequest): Promise<{
  response: NextResponse
  claims: JwtPayload | null
}> {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
        // Keeps CDNs from caching a response that carries another user's
        // Set-Cookie header.
        for (const [name, value] of Object.entries(headers)) {
          response.headers.set(name, value)
        }
      },
    },
  })

  const { data } = await supabase.auth.getClaims()

  return { response, claims: data?.claims ?? null }
}

/** Carries refreshed auth cookies over onto a redirect response. */
export function withAuthCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie)
  }
  return target
}

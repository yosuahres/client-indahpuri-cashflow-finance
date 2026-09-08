import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { safeRedirectPath } from "@/lib/site-url"

/**
 * PKCE code exchange.
 *
 * Supabase sends the user here after they click an email confirmation link or
 * complete an OAuth flow: `/auth/callback?code=...&next=/cash-flow`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get("code")
  const next = safeRedirectPath(searchParams.get("next"))

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Invalid confirmation link.")}`,
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That link is invalid or has expired.")}`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}

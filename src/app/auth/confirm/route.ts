import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/server"
import { safeRedirectPath } from "@/lib/site-url"

const OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]

function isOtpType(value: string | null): value is EmailOtpType {
  return OTP_TYPES.includes(value as EmailOtpType)
}

/**
 * Token-hash confirmation.
 *
 * Use this instead of `/auth/callback` if you switch the Supabase email
 * templates over to `{{ .TokenHash }}`, which produces links shaped like
 * `/auth/confirm?token_hash=...&type=signup&next=/`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = safeRedirectPath(searchParams.get("next"))

  if (!tokenHash || !isOtpType(type)) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Invalid confirmation link.")}`,
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("That link is invalid or has expired.")}`,
    )
  }

  return NextResponse.redirect(`${origin}${next}`)
}

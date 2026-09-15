import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * POST-only sign out, for clients that cannot call the Server Action (plain
 * HTML forms outside React, or a native shell hitting the API directly).
 */
export async function POST(request: NextRequest) {
  // Route handlers get none of the Server Action origin check, so a form on
  // another site could otherwise sign people out. No Origin at all is a
  // non-browser client, which a cross-site form cannot pretend to be.
  const origin = request.headers.get("origin")
  if (origin && origin !== request.nextUrl.origin) {
    return new NextResponse(null, { status: 403 })
  }

  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(`${request.nextUrl.origin}/login`, {
    status: 303,
  })
}

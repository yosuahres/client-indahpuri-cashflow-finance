import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"

/**
 * POST-only sign out, for clients that cannot call the Server Action (plain
 * HTML forms outside React, or a native shell hitting the API directly).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(`${request.nextUrl.origin}/login`, {
    status: 303,
  })
}

import { NextResponse, type NextRequest } from "next/server"

import { updateSession, withAuthCookies } from "@/lib/supabase/proxy"

/** Reachable signed out. Everything else in the app requires a session. */
const publicRoutes = ["/"]

/** Reachable only while signed out. */
const guestOnlyRoutes = ["/login", "/signup"]

/** Token-exchange handlers manage their own auth and must never be redirected. */
const authRoutePrefix = "/auth/"

function matches(pathname: string, routes: string[]) {
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const { response, claims } = await updateSession(request)

  if (pathname.startsWith(authRoutePrefix)) {
    return response
  }

  const isGuestOnly = matches(pathname, guestOnlyRoutes)
  const isPublic = matches(pathname, publicRoutes) || isGuestOnly

  // Optimistic redirects only — every page re-verifies through the DAL in
  // src/features/auth/session.ts.
  if (!claims && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = ""
    url.searchParams.set("next", pathname)
    return withAuthCookies(NextResponse.redirect(url), response)
  }

  if (claims && isGuestOnly) {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    url.search = ""
    return withAuthCookies(NextResponse.redirect(url), response)
  }

  return response
}

export const config = {
  matcher: [
    // Everything except static assets and image optimization, so auth cookies
    // are refreshed on real navigations only.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}

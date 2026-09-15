import "server-only"

import { cookies } from "next/headers"

import { FLASH_COOKIE, type Flash } from "./flash-cookie"

/**
 * Leaves a toast for the next page. For server actions that redirect on
 * success — their result never reaches the form, so the toast rides along in
 * a short-lived cookie the Toaster picks up and clears.
 */
export async function flash(kind: Flash["kind"], message: string) {
  const store = await cookies()
  store.set(FLASH_COOKIE, encodeURIComponent(JSON.stringify({ kind, message })), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    // The client has to read it to show it.
    httpOnly: false,
  })
}

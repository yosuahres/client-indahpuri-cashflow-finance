import { headers } from "next/headers"

/**
 * Absolute origin of the current deployment, used to build the email
 * confirmation link. Falls back to the forwarded headers so it works behind a
 * proxy and in local dev without extra configuration.
 */
export async function getSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "")
  }

  const headerList = await headers()
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host")
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") ? "http" : "https")

  return `${protocol}://${host}`
}

/**
 * Only allow redirects to paths inside this app — never to an attacker
 * supplied absolute URL.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/") {
  if (!value) return fallback
  if (!value.startsWith("/") || value.startsWith("//")) return fallback
  // Browsers read `\` as `/`, so `/\evil.com` is `//evil.com` by the time it
  // is followed; control characters are stripped the same way. Neither has
  // any business in a path of ours.
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback

  // Last word goes to the URL parser: whatever it resolves to has to stay on
  // this origin.
  const base = "http://localhost"
  try {
    if (new URL(value, base).origin !== base) return fallback
  } catch {
    return fallback
  }
  return value
}

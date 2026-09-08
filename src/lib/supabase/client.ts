import { createBrowserClient } from "@supabase/ssr"

import { env } from "@/lib/env"

/**
 * Supabase client for Client Components. `createBrowserClient` is a singleton
 * internally, so calling this on every render is cheap.
 */
export function createClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseKey)
}

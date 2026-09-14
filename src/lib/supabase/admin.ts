import "server-only"

import { createClient } from "@supabase/supabase-js"

import { env } from "@/lib/env"

/**
 * Supabase client acting as the project itself, with row level security
 * bypassed. Only for what a signed-in user's own client cannot do at all —
 * creating someone else's login. Every caller must check the role first.
 *
 * The key is read lazily rather than validated with the public ones in
 * `env.ts`: the app runs fine without it, and only the New User page needs it.
 * Newer dashboards call it the "secret" key; older ones "service_role".
 * Either name works. Never give it a NEXT_PUBLIC_ prefix.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
  if (!key) return null

  return createClient(env.supabaseUrl, key, {
    // A server-side one-off: nothing to keep signed in, nothing to refresh.
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

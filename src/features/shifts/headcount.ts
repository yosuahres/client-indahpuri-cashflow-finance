import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"

/**
 * How many employees are on each shift, keyed by shift id. A shift nobody is
 * on is simply absent from the map.
 *
 * Errors come back as an empty map rather than throwing: the count beside a
 * shift is worth losing, the list of shifts is not.
 */
export async function loadShiftHeadcount(): Promise<Record<string, number>> {
  await requireUser()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select("shift_id")
    .eq("status", "active")
    .not("shift_id", "is", null)

  if (error) return {}

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const id = row.shift_id as string | null
    if (id) counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

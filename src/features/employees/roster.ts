import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"

/**
 * The roll as attendance and leave need it: who someone is, not their record.
 * `listEmployees` asks for "Manage employees"; these pages are their own ticks,
 * so they read the same rows through the policy that lets all three (0027 §6).
 *
 * The caller checks its own permission first — this only fetches.
 */
export type RosterEntry = {
  id: string
  employeeNo: string
  fullName: string
  department: string | null
}

const UNDEFINED_TABLE = "42P01"
const MIGRATION_HINT =
  "The employees table does not exist yet. Run supabase/migrations/0017_employees.sql against the project."

export type RosterResult = { ok: boolean; error?: string; employees: RosterEntry[] }

/** Everyone still on the roll, by name. People who have left are left out. */
export async function loadRoster(): Promise<RosterResult> {
  await requireUser()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("employees")
    .select("id, employee_no, full_name, department")
    .eq("status", "active")
    .order("full_name")

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      employees: [],
    }
  }

  return {
    ok: true,
    employees: (data ?? []).map((row) => ({
      id: row.id as string,
      employeeNo: row.employee_no as string,
      fullName: row.full_name as string,
      department: (row.department as string | null) || null,
    })),
  }
}

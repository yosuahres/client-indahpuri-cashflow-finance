"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission, requireUser } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { flash } from "@/lib/flash"
import { safeRedirectPath } from "@/lib/site-url"

import { CLOCK, isShiftColor, type ShiftColorValue } from "./constants"

/** One shift: what it is called, when it runs, and how it is marked. */
export type Shift = {
  id: string
  name: string
  /** `HH:MM` on a 24-hour clock. */
  startsAt: string
  endsAt: string
  color: ShiftColorValue
  /** When the shift was added, as an ISO timestamp. */
  createdAt: string
}

const UNDEFINED_TABLE = "42P01"
const UNIQUE_VIOLATION = "23505"

const MIGRATION_HINT =
  "The shifts table does not exist yet. Run supabase/migrations/0028_shifts.sql against the project."

function errorMessage(error: { code?: string; message: string }) {
  return error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message
}

/** Postgres hands back `HH:MM:SS`; the app wants `HH:MM`. */
const toClock = (value: string) => value.slice(0, 5)

export type ShiftsResult = { ok: boolean; error?: string; shifts: Shift[] }

/**
 * Every shift, earliest start first — the order a day actually runs in, which
 * is more useful on a roster than alphabetical.
 */
export async function listShifts(): Promise<ShiftsResult> {
  await requireUser()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("shifts")
    .select("id, name, starts_at, ends_at, color, created_at")
    .order("starts_at")

  if (error) return { ok: false, error: errorMessage(error), shifts: [] }

  return {
    ok: true,
    shifts: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      startsAt: toClock(row.starts_at as string),
      endsAt: toClock(row.ends_at as string),
      color: row.color as ShiftColorValue,
      createdAt: row.created_at as string,
    })),
  }
}

export async function createShift(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim()
  const startsAt = String(formData.get("startsAt") ?? "").trim()
  const endsAt = String(formData.get("endsAt") ?? "").trim()
  const color = String(formData.get("color") ?? "").trim()

  const fieldErrors: Record<string, string> = {}
  if (!name) fieldErrors.name = "Give the shift a name."
  else if (name.length > 60) fieldErrors.name = "Keep the name under 60 characters."
  if (!CLOCK.test(startsAt)) fieldErrors.startsAt = "Use a 24-hour time, like 08:00."
  if (!CLOCK.test(endsAt)) fieldErrors.endsAt = "Use a 24-hour time, like 17:00."
  if (!isShiftColor(color)) fieldErrors.color = "Pick a roster colour."
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const user = await requirePermission("attendance.manage")

  const { error } = await supabase
    .from("shifts")
    .insert({ user_id: user.id, name, starts_at: startsAt, ends_at: endsAt, color })

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: `There is already a shift called "${name}".` } }
    }
    return { error: errorMessage(error) }
  }

  refresh()

  // Back to whatever sent us here — the employee form, usually, which then
  // needs the new shift picked. It is matched there by name.
  const next = safeRedirectPath(formData.get("next")?.toString(), "/hris/attendance/shifts")
  const separator = next.includes("?") ? "&" : "?"
  await flash("success", "Shift added.")
  redirect(`${next}${separator}shift=${encodeURIComponent(name)}`)
}

export type RowResult = { ok: boolean; error?: string }

/**
 * Removes one shift. Anyone on it keeps their record but loses their hours —
 * the column is emptied rather than the delete being refused (0028 §2).
 */
export async function deleteShift(id: string): Promise<RowResult> {
  if (!id) return { ok: false, error: "Nothing to remove." }
  await requirePermission("attendance.manage")

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("shifts")
    .delete()
    .eq("id", id)
    // Returning the row is what makes this real rather than assumed.
    .select("id")

  if (error) return { ok: false, error: errorMessage(error) }
  if (!data || data.length === 0) return { ok: false, error: "That shift no longer exists." }

  refresh()
  return { ok: true }
}

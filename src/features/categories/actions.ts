"use server"

import { createClient } from "@/lib/supabase/server"
import { isSection, type SectionValue } from "@/lib/finance"

export type Category = { id: string; name: string; section: SectionValue }

export type CategoryResult =
  | { ok: true; categories: Category[] }
  | { ok: false; error: string; categories: Category[] }

/** Postgres "relation does not exist" — the migration has not been run. */
const UNDEFINED_TABLE = "42P01"
/** Postgres unique violation. */
const UNIQUE_VIOLATION = "23505"

const MIGRATION_HINT =
  "The categories table does not exist yet. Run supabase/migrations/0002_categories.sql against the project."

async function fetchAll(): Promise<CategoryResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, section")
    .order("section")
    .order("name")

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      categories: [],
    }
  }
  return { ok: true, categories: (data ?? []) as Category[] }
}

export async function listCategories(): Promise<CategoryResult> {
  return fetchAll()
}

export async function addCategory(
  name: string,
  section: string,
): Promise<CategoryResult> {
  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: "Enter a name.", categories: [] }
  if (!isSection(section)) {
    return { ok: false, error: "Pick a section.", categories: [] }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Your session expired.", categories: [] }

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name: trimmed, section })

  if (error) {
    const message =
      error.code === UNDEFINED_TABLE
        ? MIGRATION_HINT
        : error.code === UNIQUE_VIOLATION
          ? `"${trimmed}" is already in that section.`
          : error.message
    const current = await fetchAll()
    return { ok: false, error: message, categories: current.categories }
  }

  return fetchAll()
}

export async function deleteCategory(id: string): Promise<CategoryResult> {
  const supabase = await createClient()
  const { error } = await supabase.from("categories").delete().eq("id", id)

  if (error) {
    const current = await fetchAll()
    return { ok: false, error: error.message, categories: current.categories }
  }
  return fetchAll()
}

/** One-click fill for a new account, using the built-in suggestion list. */
export async function seedCategories(
  suggestions: { name: string; section: SectionValue }[],
): Promise<CategoryResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Your session expired.", categories: [] }

  const rows = suggestions
    .filter((entry) => isSection(entry.section) && entry.name.trim())
    .map((entry) => ({
      user_id: user.id,
      name: entry.name.trim(),
      section: entry.section,
    }))

  // Skip anything already there rather than failing the whole batch.
  const { error } = await supabase
    .from("categories")
    .upsert(rows, { onConflict: "user_id,section,name", ignoreDuplicates: true })

  if (error) {
    const current = await fetchAll()
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      categories: current.categories,
    }
  }
  return fetchAll()
}

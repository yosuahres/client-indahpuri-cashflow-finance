"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requireUser } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { safeRedirectPath } from "@/lib/site-url"
import type { AccountTypeValue } from "./constants"
import { forType, readAccount, validateAccount } from "./validation"

export type Account = {
  id: string
  name: string
  type: AccountTypeValue
  provider: string | null
  accountNo: string | null
  holder: string | null
  isCompanyAccount: boolean
}

const UNDEFINED_TABLE = "42P01"
const UNIQUE_VIOLATION = "23505"

const MIGRATION_HINT =
  "The accounts table does not exist yet. Run supabase/migrations/0003_accounts.sql against the project."

export type AccountsResult =
  | { ok: true; accounts: Account[] }
  | { ok: false; error: string; accounts: Account[] }

export async function listAccounts(): Promise<AccountsResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, type, provider, account_no, holder, is_company_account")
    .order("name")

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      accounts: [],
    }
  }

  return {
    ok: true,
    accounts: (data ?? []).map((row) => ({
      id: row.id as string,
      name: row.name as string,
      type: row.type as AccountTypeValue,
      provider: row.provider as string | null,
      accountNo: row.account_no as string | null,
      holder: row.holder as string | null,
      isCompanyAccount: row.is_company_account as boolean,
    })),
  }
}

/** One account with every field the edit form shows, notes included. */
export type AccountDetails = Account & { notes: string | null }

export type AccountResult =
  | { ok: true; account: AccountDetails | null }
  | { ok: false; error: string; account: null }

export async function getAccount(id: string): Promise<AccountResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("accounts")
    .select("id, name, type, provider, account_no, holder, notes, is_company_account")
    .eq("id", id)
    .maybeSingle()

  if (error) {
    return {
      ok: false,
      error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message,
      account: null,
    }
  }
  if (!data) return { ok: true, account: null }

  return {
    ok: true,
    account: {
      id: data.id as string,
      name: data.name as string,
      type: data.type as AccountTypeValue,
      provider: data.provider as string | null,
      accountNo: data.account_no as string | null,
      holder: data.holder as string | null,
      notes: data.notes as string | null,
      isCompanyAccount: data.is_company_account as boolean,
    },
  }
}

export async function createAccount(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const input = readAccount(formData)
  const fieldErrors = validateAccount(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const user = await requireUser()

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: input.name,
    type: input.type,
    ...forType(input),
    is_company_account: formData.get("isCompanyAccount") === "on",
  })

  if (error) {
    if (error.code === UNDEFINED_TABLE) return { error: MIGRATION_HINT }
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: `You already have an account called "${input.name}".` } }
    }
    return { error: error.message }
  }

  refresh()

  // Return to whatever sent us here, with the new account pre-selected.
  const next = safeRedirectPath(formData.get("next")?.toString(), "/transactions/new")
  const separator = next.includes("?") ? "&" : "?"
  redirect(`${next}${separator}account=${encodeURIComponent(input.name)}`)
}

/**
 * Saves changes to an existing account.
 *
 * Transactions and budgets file the account by name, so a rename left alone
 * would strand everything recorded against the old one — still counted, but
 * no longer reachable from any account filter. The new name is carried onto
 * them. These are separate statements; if a later one fails the account row
 * has already changed, and the error says what was left behind.
 */
export async function updateAccount(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = String(formData.get("id") ?? "")
  if (!id) return { error: "That account is no longer open." }

  const input = readAccount(formData)
  const fieldErrors = validateAccount(input)
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const user = await requireUser()

  const { data: before, error: readError } = await supabase
    .from("accounts")
    .select("name")
    .eq("id", id)
    .maybeSingle()

  if (readError) {
    return { error: readError.code === UNDEFINED_TABLE ? MIGRATION_HINT : readError.message }
  }
  if (!before) return { error: "That account no longer exists." }

  const { error } = await supabase
    .from("accounts")
    .update({
      name: input.name,
      type: input.type,
      ...forType(input),
      is_company_account: formData.get("isCompanyAccount") === "on",
    })
    .eq("id", id)

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { fieldErrors: { name: `You already have an account called "${input.name}".` } }
    }
    return { error: error.message }
  }

  const oldName = before.name as string
  if (oldName !== input.name) {
    for (const table of ["transactions", "budgets"] as const) {
      const { error: carryError } = await supabase
        .from(table)
        .update({ account: input.name })
        .eq("user_id", user.id)
        .eq("account", oldName)

      if (carryError) {
        return {
          error: `The account was renamed, but its ${table} still say "${oldName}": ${carryError.message}`,
        }
      }
    }
  }

  refresh()
  redirect("/accounts")
}

export type RowResult = { ok: boolean; error?: string }

/**
 * Removes one account. Transactions and budgets keep the name they were filed
 * under, so history stays in the reports — it just no longer has an account
 * behind it. The caller is expected to have confirmed first.
 */
export async function deleteAccount(id: string): Promise<RowResult> {
  if (!id) return { ok: false, error: "That account is no longer open." }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    // Returning the row is what makes this real rather than assumed.
    .select("id")

  if (error) {
    return { ok: false, error: error.code === UNDEFINED_TABLE ? MIGRATION_HINT : error.message }
  }
  if (!data || data.length === 0) return { ok: false, error: "That account no longer exists." }

  refresh()
  return { ok: true }
}

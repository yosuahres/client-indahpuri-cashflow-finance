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

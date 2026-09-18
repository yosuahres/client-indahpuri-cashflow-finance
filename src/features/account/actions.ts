"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"
import { createClient as createStatelessClient } from "@supabase/supabase-js"

import { requireUser } from "@/features/auth/session"
import { deleteLogin } from "@/features/users/delete-login"
import { env } from "@/lib/env"
import { flash } from "@/lib/flash"
import { hasFieldErrors, type FormState } from "@/lib/form-state"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

/**
 * Renames the signed-in user. The name lives in two places: the login's
 * metadata, which the session reads, and the profile, which the Users list
 * reads. Nobody may write their own profile row through row level security,
 * so that half goes through the admin client — for this user's id only.
 */
export async function updateName(_prevState: FormState, formData: FormData): Promise<FormState> {
  const me = await requireUser()

  const name = String(formData.get("name") ?? "").trim()
  if (!name) return { fieldErrors: { name: "Enter your name." } }
  if (name.length > 80) return { fieldErrors: { name: "Keep the name under 80 characters." } }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ data: { full_name: name } })
  if (error) return { error: error.message }

  // The session's token still carries the old name until it is reissued.
  await supabase.auth.refreshSession()

  const admin = createAdminClient()
  if (admin) await admin.from("profiles").update({ full_name: name }).eq("id", me.id)

  refresh()
  return { message: "Name updated.", savedAt: Date.now() }
}

/**
 * Sets a new password once the current one checks out. The check signs in on a
 * throwaway client, so the browser's own session is left alone.
 */
export async function changePassword(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const me = await requireUser()

  const current = String(formData.get("currentPassword") ?? "")
  const next = String(formData.get("newPassword") ?? "")
  const confirm = String(formData.get("confirmPassword") ?? "")

  const fieldErrors: Record<string, string> = {}
  if (!current) fieldErrors.currentPassword = "Enter your current password."
  if (!next) fieldErrors.newPassword = "Enter a new password."
  else if (next === current) fieldErrors.newPassword = "Pick a password you are not using now."
  if (next && confirm !== next) fieldErrors.confirmPassword = "The passwords do not match."
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  const probe = createStatelessClient(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error: checkError } = await probe.auth.signInWithPassword({
    email: me.email,
    password: current,
  })
  if (checkError) {
    return { fieldErrors: { currentPassword: "That is not your current password." } }
  }
  await probe.auth.signOut({ scope: "local" })

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: next })
  if (error) {
    // Supabase applies the project's password policy; its message says why.
    if (error.code === "weak_password") return { fieldErrors: { newPassword: error.message } }
    return { error: error.message }
  }

  return { message: "Password changed.", savedAt: Date.now() }
}

/** Deletes the signed-in user's own login. What they entered stays. */
export async function deleteMyAccount(): Promise<{ ok: false; error: string }> {
  const me = await requireUser()

  const result = await deleteLogin(me.id)
  if (!result.ok) return { ok: false, error: result.error ?? "Could not delete your account." }

  // The login is gone; clear the cookies it left behind.
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: "local" })

  refresh()
  await flash("success", "Your account has been deleted.")
  redirect("/login")
}

"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { safeRedirectPath } from "@/lib/site-url"

import { hasErrors, validateLogin, type AuthFormState } from "./validation"

export async function login(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = safeRedirectPath(formData.get("next")?.toString())

  const fieldErrors = validateLogin(email, password)
  if (hasErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Deliberately vague: never reveal whether the address is registered.
    return { error: "Incorrect email or password." }
  }

  refresh()
  redirect(next)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  refresh()
  redirect("/login")
}

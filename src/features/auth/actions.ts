"use server"

import { redirect } from "next/navigation"
import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { getSiteUrl, safeRedirectPath } from "@/lib/site-url"

import {
  hasErrors,
  validateLogin,
  validateSignup,
  type AuthFormState,
} from "./validation"

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

export async function signup(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  const fieldErrors = validateSignup(email, password, confirmPassword)
  if (hasErrors(fieldErrors)) return { fieldErrors }

  const supabase = await createClient()
  const siteUrl = await getSiteUrl()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/` },
  })

  if (error) {
    // Same notice as a fresh sign-up, so the form cannot confirm that an
    // address is registered.
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      return {
        message: `We sent a confirmation link to ${email}. Open it to finish signing up.`,
      }
    }
    if (error.code === "weak_password") return { fieldErrors: { password: error.message } }
    if (error.status === 429) return { error: "Too many attempts. Wait a minute and try again." }
    return { error: "Could not sign you up right now. Try again shortly." }
  }

  // With email confirmation on, signing up with an address that already exists
  // succeeds but comes back with no identities. Show the same notice either
  // way so the endpoint cannot be used to enumerate accounts.
  if (!data.session) {
    return {
      message: `We sent a confirmation link to ${email}. Open it to finish signing up.`,
    }
  }

  // Email confirmation is disabled on the project — the user is already signed in.
  refresh()
  redirect("/")
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()

  refresh()
  redirect("/login")
}

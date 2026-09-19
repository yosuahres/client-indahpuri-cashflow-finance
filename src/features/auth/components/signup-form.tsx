"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"

import { signup } from "../actions"
import { MIN_PASSWORD_LENGTH, type AuthFormState } from "../validation"
import { FormError, FormNotice } from "./form-message"

const initialState: AuthFormState = {}

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signup, initialState)
  const fieldErrors = state.fieldErrors ?? {}

  // Confirmation email sent — the form has nothing left to do.
  if (state.message) {
    return <FormNotice>{state.message}</FormNotice>
  }

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      {state.error ? <FormError>{state.error}</FormError> : null}

      <Field label="Email" htmlFor="email" error={fieldErrors.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={fieldErrors.password}>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
      </Field>

      <Field
        label="Confirm password"
        htmlFor="confirmPassword"
        error={fieldErrors.confirmPassword}
      >
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Repeat password"
          aria-invalid={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={
            fieldErrors.confirmPassword ? "confirmPassword-error" : undefined
          }
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-1 h-10 sm:text-sm">
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  )
}

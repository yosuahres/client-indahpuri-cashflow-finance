"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"

import { login } from "../actions"
import { FormError } from "./form-message"
import type { AuthFormState } from "../validation"

const initialState: AuthFormState = {}

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(login, initialState)
  const fieldErrors = state.fieldErrors ?? {}

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="next" value={next} />

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
          autoComplete="current-password"
          placeholder="Password"
          aria-invalid={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? "password-error" : undefined}
        />
      </Field>

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Logging in…" : "Login"}
      </Button>
    </form>
  )
}

"use client"

import { useActionState, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Field, TextInput } from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { Select } from "@/components/form/select"
import { ROLES, type Role } from "@/features/auth/roles"
import type { FormState } from "@/lib/form-state"
import { useActionToast } from "@/components/ui/toast"

import { createMember } from "../actions"

const initialState: FormState = {}

export function UserForm() {
  const [state, formAction, pending] = useActionState(createMember, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  // Held in state so a rejected save does not wipe what was typed: React
  // resets uncontrolled fields once a form action finishes.
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<Role>("admin")
  const [showPassword, setShowPassword] = useState(false)

  const spec = ROLES.find((entry) => entry.value === role)

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <FormHeader
        crumbs={[{ label: "Users", href: "/users" }]}
        title="New User"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending}>Create</SaveButton>}
      />


      <FormSection title="Login">
        <FormGrid>
          <Field label="Name" htmlFor="name" error={errors.name} hint="Shown in the sidebar and the Users list.">
            <TextInput
              id="name"
              name="name"
              autoComplete="off"
              placeholder="e.g. Siti Rahma"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label="Email" htmlFor="email" required error={errors.email}>
            <TextInput
              id="email"
              name="email"
              type="email"
              autoComplete="off"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </Field>

          <Field
            label="Password"
            htmlFor="password"
            required
            error={errors.password}
            hint="Pass it on to them yourself — no email is sent."
          >
            <div className="relative">
              <TextInput
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(errors.password)}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-neutral-500 hover:text-neutral-900"
              >
                {showPassword ? (
                  <EyeOff className="size-4" strokeWidth={1.75} />
                ) : (
                  <Eye className="size-4" strokeWidth={1.75} />
                )}
              </button>
            </div>
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Access" className="border-b-0">
        <FormGrid>
          <Field label="Role" htmlFor="role" required error={errors.role} hint={spec?.description}>
            <Select
              id="role"
              name="role"
              value={role}
              onValueChange={(value) => setRole(value as Role)}
              options={ROLES.map((entry) => ({ value: entry.value, label: entry.label }))}
              invalid={Boolean(errors.role)}
            />
          </Field>
        </FormGrid>
      </FormSection>
    </form>
  )
}

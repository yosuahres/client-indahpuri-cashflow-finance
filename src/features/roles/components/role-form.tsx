"use client"

import { useActionState, useState } from "react"

import { Field, TextArea, TextInput } from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { Select } from "@/components/form/select"
import type { RoleSummary } from "@/features/auth/roles"
import type { FormState } from "@/lib/form-state"
import { useActionToast } from "@/components/ui/toast"

import { createRole, updateRole } from "../actions"

const initialState: FormState = {}

/** "No, start empty" in the Start from picker; a Select option cannot carry null. */
const START_EMPTY = ""

/**
 * Adds a role, or renames one. A new role can start from another role's
 * permissions; either way it lands on the grid to be ticked.
 */
export function RoleForm({
  role,
  roles,
}: {
  /** The role being edited; absent when adding one. */
  role?: RoleSummary
  /** Offered under "Start from" when adding. */
  roles: RoleSummary[]
}) {
  const [state, formAction, pending] = useActionState(role ? updateRole : createRole, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  // Held in state so a rejected save does not wipe what was typed.
  const [name, setName] = useState(role?.name ?? "")
  const [description, setDescription] = useState(role?.description ?? "")
  const [copyFrom, setCopyFrom] = useState(START_EMPTY)

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      {role ? <input type="hidden" name="key" value={role.key} /> : null}

      <FormHeader
        crumbs={[{ label: "Settings" }, { label: "Roles", href: "/settings/roles" }]}
        title={role ? `Edit ${role.name}` : "New Role"}
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending}>{role ? "Save" : "Create"}</SaveButton>}
      />

      <FormSection title="Role" className={role ? "border-b-0" : undefined}>
        <FormGrid>
          <Field label="Name" htmlFor="name" required error={errors.name} hint="Shown in Users and on the permission grid.">
            <TextInput
              id="name"
              name="name"
              autoComplete="off"
              maxLength={40}
              placeholder="e.g. Cashier"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label="Description" htmlFor="description" error={errors.description}>
            <TextArea
              id="description"
              name="description"
              rows={2}
              maxLength={160}
              placeholder="What this role is for"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={Boolean(errors.description)}
            />
          </Field>
        </FormGrid>
      </FormSection>

      {role ? null : (
        <FormSection title="Permissions" className="border-b-0">
          <FormGrid>
            <Field
              label="Start from"
              htmlFor="copyFrom"
              hint="Copies that role's ticks, except user management. You can change them next."
            >
              <Select
                id="copyFrom"
                name="copyFrom"
                value={copyFrom}
                onValueChange={setCopyFrom}
                options={[
                  { value: START_EMPTY, label: "Nothing ticked" },
                  ...roles.map((entry) => ({ value: entry.key, label: entry.name })),
                ]}
              />
            </Field>
          </FormGrid>
        </FormSection>
      )}
    </form>
  )
}

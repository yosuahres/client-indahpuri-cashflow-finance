"use client"

import { useActionState } from "react"

import { Field, TextInput } from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import type { FormState } from "@/lib/form-state"
import { useActionToast } from "@/components/ui/toast"

import { createDepartment } from "../actions"

const initialState: FormState = {}

export function DepartmentForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(createDepartment, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <input type="hidden" name="next" value={next} />

      <FormHeader
        crumbs={[{ label: "Departments", href: "/hris/departments" }]}
        title="New Department"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />


      <FormSection className="border-b-0">
        <FormGrid>
          <Field label="Department Name" htmlFor="name" required error={errors.name}>
            <TextInput
              id="name"
              name="name"
              autoComplete="off"
              placeholder="e.g. Operations, Finance, Housekeeping"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>
        </FormGrid>
      </FormSection>
    </form>
  )
}

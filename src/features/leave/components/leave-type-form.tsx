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

import { createLeaveType } from "../type-actions"

const initialState: FormState = {}

export function LeaveTypeForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(createLeaveType, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <input type="hidden" name="next" value={next} />

      <FormHeader
        crumbs={[{ label: "Leave Types", href: "/hris/leave/types" }]}
        title="New Leave Type"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />

      <FormSection className="border-b-0">
        <FormGrid>
          <Field label="Leave Type Name" htmlFor="name" required error={errors.name}>
            <TextInput
              id="name"
              name="name"
              autoComplete="off"
              maxLength={60}
              placeholder="e.g. Marriage, Bereavement, Hajj"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>
        </FormGrid>
      </FormSection>
    </form>
  )
}

"use client"

import { useActionState, useState } from "react"

import { CheckboxField, Field, TextArea, TextInput } from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { Select } from "@/components/form/select"
import type { FormState } from "@/lib/form-state"

import { ACCOUNT_TYPES, accountTypeSpec, type AccountTypeValue } from "../constants"
import { createAccount } from "../actions"

const initialState: FormState = {}

export function AccountForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(createAccount, initialState)
  const errors = state.fieldErrors ?? {}

  const [type, setType] = useState<AccountTypeValue>("bank")
  const [isCompanyAccount, setIsCompanyAccount] = useState(true)

  // The type decides which of the remaining fields make sense.
  const spec = accountTypeSpec(type)

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <input type="hidden" name="next" value={next} />

      <FormHeader
        crumbs={[{ label: "Accounts" }]}
        title="New Account"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />

      {state.error ? (
        <p role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800">
          {state.error}
        </p>
      ) : null}

      <FormSection>
        <FormGrid>
          <Field
            label="Account Name"
            htmlFor="name"
            required
            error={errors.name}
            hint={
              type === "cash"
                ? "Name the tin, e.g. “Petty Cash — Front Office”."
                : "What you will pick from on a transaction."
            }
          >
            <TextInput
              id="name"
              name="name"
              placeholder="e.g. Bank BCA — Operational"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label="Account Type" htmlFor="type" required error={errors.type}>
            <Select
              id="type"
              name="type"
              value={type}
              onValueChange={(value) => setType(value as AccountTypeValue)}
              options={ACCOUNT_TYPES.map((entry) => ({
                value: entry.value,
                label: entry.label,
              }))}
              invalid={Boolean(errors.type)}
            />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title={spec.label} className="border-b-0">
        <FormGrid>
          {spec.provider ? (
            <Field
              label={spec.provider.label}
              htmlFor="provider"
              required
              error={errors.provider}
            >
              <TextInput
                id="provider"
                name="provider"
                placeholder={spec.provider.placeholder}
                aria-invalid={Boolean(errors.provider)}
              />
            </Field>
          ) : null}

          {spec.accountNo ? (
            <Field label={spec.accountNo.label} htmlFor="accountNo" error={errors.accountNo}>
              <TextInput
                id="accountNo"
                name="accountNo"
                inputMode="numeric"
                autoComplete="off"
                placeholder={spec.accountNo.placeholder}
                aria-invalid={Boolean(errors.accountNo)}
              />
            </Field>
          ) : null}

          {spec.holder ? (
            <Field
              label={spec.holder.label}
              htmlFor="holder"
              hint="Who is responsible for this money."
            >
              <TextInput id="holder" name="holder" placeholder={spec.holder.placeholder} />
            </Field>
          ) : null}

          {spec.notes ? (
            <Field label={spec.notes.label} htmlFor="notes" className="md:col-span-2">
              <TextArea id="notes" name="notes" rows={3} placeholder={spec.notes.placeholder} />
            </Field>
          ) : null}

          <CheckboxField
            label="Is company account"
            hint="Untick for a personal account you only use to reimburse."
            name="isCompanyAccount"
            checked={isCompanyAccount}
            onChange={(event) => setIsCompanyAccount(event.target.checked)}
            className="md:col-span-2"
          />
        </FormGrid>
      </FormSection>
    </form>
  )
}

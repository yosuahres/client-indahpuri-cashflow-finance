"use client"

import { useActionState, useState } from "react"

import { DatePicker } from "@/components/form/date-picker"
import {
  CheckboxField,
  Field,
  MoneyInput,
  TextArea,
  TextInput,
} from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { Select } from "@/components/form/select"
import { AccountField } from "@/features/accounts/components/account-field"
import type { Account } from "@/features/accounts/actions"
import { CategoryField } from "@/features/categories/components/category-field"
import type { Category } from "@/features/categories/actions"
import { SECTIONS, TRANSACTION_KINDS, type SectionValue } from "@/lib/finance"
import type { FormState } from "@/lib/form-state"

import { createTransaction } from "../actions"

const initialState: FormState = {}

export function TransactionForm({
  today,
  initialCategories,
  initialAccounts,
  defaultAccount,
  setupError,
}: {
  today: string
  initialCategories: Category[]
  initialAccounts: Account[]
  /** Pre-selected after returning from the New Account page. */
  defaultAccount?: string
  setupError?: string
}) {
  const [state, formAction, pending] = useActionState(createTransaction, initialState)
  const errors = state.fieldErrors ?? {}

  const [categories, setCategories] = useState(initialCategories)
  const [date, setDate] = useState(today)
  const [kind, setKind] = useState("income")
  const [section, setSection] = useState<SectionValue>("operations")
  const [category, setCategory] = useState("")
  const [account, setAccount] = useState(defaultAccount ?? "")
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [party, setParty] = useState("")
  const [reference, setReference] = useState("")
  const [addAnother, setAddAnother] = useState(false)

  // Clear the entry fields once the server confirms a save, keeping the ones
  // you would reuse when logging several receipts in a row. Adjusting state
  // during render rather than in an effect, so the cleared form paints first.
  const [seenSave, setSeenSave] = useState(state.savedAt)
  if (state.savedAt !== seenSave) {
    setSeenSave(state.savedAt)
    setAmount("")
    setNotes("")
    setParty("")
    setReference("")
  }

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <FormHeader
        crumbs={[{ label: "Transactions" }]}
        title="New Transaction"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />

      {state.message ? (
        <p role="status" className="border-b border-emerald-200 bg-emerald-50 px-6 py-3 text-sm text-emerald-800">
          {state.message}
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800">
          {state.error}
        </p>
      ) : null}

      {setupError ? (
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
          {setupError}
        </p>
      ) : null}

      <FormSection>
        <FormGrid>
          <Field label="Date" htmlFor="occurredOn" required error={errors.occurredOn}>
            <DatePicker
              id="occurredOn"
              name="occurredOn"
              value={date}
              onValueChange={setDate}
              today={today}
              invalid={Boolean(errors.occurredOn)}
            />
          </Field>

          <Field label="Type" htmlFor="kind" required error={errors.kind}>
            <Select
              id="kind"
              name="kind"
              value={kind}
              onValueChange={setKind}
              options={TRANSACTION_KINDS.map((entry) => ({ value: entry.value, label: entry.label }))}
              invalid={Boolean(errors.kind)}
            />
          </Field>

          <Field
            label="Cash Flow Section"
            htmlFor="section"
            required
            error={errors.section}
            hint="Where this lands in the Cash Flow report."
          >
            <Select
              id="section"
              name="section"
              value={section}
              onValueChange={(value) => {
                setSection(value as SectionValue)
                // Categories are per section, so the old pick no longer applies.
                setCategory("")
              }}
              options={SECTIONS.map((entry) => ({ value: entry.value, label: entry.label }))}
              invalid={Boolean(errors.section)}
            />
          </Field>

          <Field label="Category" htmlFor="category" required error={errors.category}>
            <CategoryField
              id="category"
              name="category"
              section={section}
              value={category}
              onValueChange={setCategory}
              categories={categories}
              onCategoriesChange={setCategories}
              invalid={Boolean(errors.category)}
            />
          </Field>

          <Field label="Account" htmlFor="account" required error={errors.account}>
            <AccountField
              id="account"
              name="account"
              value={account}
              onValueChange={setAccount}
              accounts={initialAccounts}
              invalid={Boolean(errors.account)}
            />
          </Field>

          <Field label="Amount" htmlFor="amount" required error={errors.amount}>
            <MoneyInput
              id="amount"
              name="amount"
              value={amount}
              onValueChange={setAmount}
              invalid={Boolean(errors.amount)}
            />
          </Field>

          <Field label="Party" htmlFor="party" hint="Customer or supplier, if this involves one.">
            <TextInput
              id="party"
              name="party"
              value={party}
              onChange={(event) => setParty(event.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Reference No." htmlFor="reference">
            <TextInput
              id="reference"
              name="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Invoice or receipt number"
            />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Notes">
        <Field label="Description" htmlFor="notes">
          <TextArea
            id="notes"
            name="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What was this for?"
          />
        </Field>
      </FormSection>

      <FormSection className="border-b-0">
        <CheckboxField
          label="Keep this form open after saving"
          hint="Useful when entering a stack of receipts in one sitting."
          name="addAnother"
          checked={addAnother}
          onChange={(event) => setAddAnother(event.target.checked)}
        />
      </FormSection>
    </form>
  )
}

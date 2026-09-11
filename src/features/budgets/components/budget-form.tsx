"use client"

import { useActionState, useState } from "react"

import {
  CheckboxField,
  Field,
  MoneyInput,
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
import { CategoryField } from "@/features/categories/components/category-field"
import type { Category } from "@/features/categories/actions"
import {
  FREQUENCIES,
  SECTIONS,
  TRANSACTION_KINDS,
  type Frequency,
  type SectionValue,
  type TransactionKind,
} from "@/lib/finance"
import type { FormState } from "@/lib/form-state"

import { createBudget } from "../actions"

const initialState: FormState = {}

export function BudgetForm({
  defaultYear,
  initialCategories,
  setupError,
}: {
  defaultYear: number
  initialCategories: Category[]
  setupError?: string
}) {
  const [state, formAction, pending] = useActionState(createBudget, initialState)
  const errors = state.fieldErrors ?? {}

  const [fromYear, setFromYear] = useState(String(defaultYear))
  const [toYear, setToYear] = useState(String(defaultYear))
  const [frequency, setFrequency] = useState<Frequency>("Monthly")
  const [amount, setAmount] = useState("")
  const [section, setSection] = useState<SectionValue>("operations")
  const [kind, setKind] = useState<TransactionKind>("expense")
  const [categories, setCategories] = useState(initialCategories)
  const [category, setCategory] = useState("")

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <FormHeader
        crumbs={[{ label: "Budget" }]}
        title="New Budget"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />

      {state.error ? (
        <p
          role="alert"
          className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:px-6"
        >
          {state.error}
        </p>
      ) : null}

      {setupError ? (
        <p
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {setupError}
        </p>
      ) : null}

      <FormSection>
        <FormGrid>
          <Field label="Budget Name" htmlFor="name" required error={errors.name}>
            <TextInput
              id="name"
              name="name"
              placeholder="e.g. Operations 2026"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field
            label="Type"
            htmlFor="kind"
            required
            error={errors.kind}
            hint="Whether this plans money coming in or going out."
          >
            <Select
              id="kind"
              name="kind"
              value={kind}
              onValueChange={(value) => {
                setKind(value as TransactionKind)
                // Categories belong to one direction, so the old pick is gone.
                setCategory("")
              }}
              options={TRANSACTION_KINDS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              invalid={Boolean(errors.kind)}
            />
          </Field>

          <Field
            label="Cash Flow Section"
            htmlFor="section"
            required
            error={errors.section}
            hint="The Cash Flow section this budget is measured against."
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
              options={SECTIONS.map((option) => ({ value: option.value, label: option.label }))}
              invalid={Boolean(errors.section)}
            />
          </Field>

          <Field
            label="Category"
            htmlFor="category"
            error={errors.category}
            hint="Leave on the whole section to budget every category in it."
          >
            <CategoryField
              id="category"
              name="category"
              kind={kind}
              section={section}
              value={category}
              onValueChange={setCategory}
              categories={categories}
              onCategoriesChange={setCategories}
              emptyOptionLabel="Whole section"
              invalid={Boolean(errors.category)}
            />
          </Field>

          <Field label="From Fiscal Year" htmlFor="fromYear" required error={errors.fromYear}>
            <TextInput
              id="fromYear"
              name="fromYear"
              type="number"
              value={fromYear}
              onChange={(event) => setFromYear(event.target.value)}
              aria-invalid={Boolean(errors.fromYear)}
            />
          </Field>

          <Field label="To Fiscal Year" htmlFor="toYear" required error={errors.toYear}>
            <TextInput
              id="toYear"
              name="toYear"
              type="number"
              value={toYear}
              onChange={(event) => setToYear(event.target.value)}
              aria-invalid={Boolean(errors.toYear)}
            />
          </Field>

          <Field
            label="Frequency"
            htmlFor="frequency"
            required
            error={errors.frequency}
            hint="The cadence this plan is reviewed on."
          >
            <Select
              id="frequency"
              name="frequency"
              value={frequency}
              onValueChange={(next) => setFrequency(next as Frequency)}
              options={FREQUENCIES.map((option) => ({ value: option, label: option }))}
              invalid={Boolean(errors.frequency)}
            />
          </Field>

          <Field label="Budget Amount" htmlFor="amount" required error={errors.amount}>
            <MoneyInput
              id="amount"
              name="amount"
              value={amount}
              onValueChange={setAmount}
              invalid={Boolean(errors.amount)}
            />
          </Field>

          <Field
            label="Cost Center"
            htmlFor="costCenter"
            hint="Department or project this budget belongs to."
          >
            <TextInput id="costCenter" name="costCenter" placeholder="Optional" />
          </Field>
        </FormGrid>
      </FormSection>

      <FormSection title="Alerts" className="border-b-0">
        <CheckboxField
          label="Warn when actuals exceed this budget"
          hint="Shown on the Cash Flow report; it does not block anything."
          name="warnOnOverrun"
          defaultChecked
        />
      </FormSection>
    </form>
  )
}

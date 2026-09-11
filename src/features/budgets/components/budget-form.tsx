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
import { longMonthName } from "@/features/reporting/months"
import {
  BUDGET_PERIODS,
  SECTIONS,
  TRANSACTION_KINDS,
  type BudgetPeriod,
  type SectionValue,
  type TransactionKind,
} from "@/lib/finance"
import type { FormState } from "@/lib/form-state"

import { createBudget } from "../actions"

const initialState: FormState = {}

/** Month names come from the report, so both read the period the same way. */
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: longMonthName(index + 1),
}))

/** A plan is made for the year ahead or corrected for one just past. */
function yearOptions(around: number) {
  return Array.from({ length: 6 }, (_, index) => {
    const year = around - 2 + index
    return { value: String(year), label: String(year) }
  })
}

export function BudgetForm({
  defaultYear,
  defaultMonth,
  initialCategories,
  setupError,
}: {
  defaultYear: number
  /** 1-12. */
  defaultMonth: number
  initialCategories: Category[]
  setupError?: string
}) {
  const [state, formAction, pending] = useActionState(createBudget, initialState)
  const errors = state.fieldErrors ?? {}

  const [period, setPeriod] = useState<BudgetPeriod>("monthly")
  const [periodYear, setPeriodYear] = useState(String(defaultYear))
  const [periodMonth, setPeriodMonth] = useState(String(defaultMonth))
  const [amount, setAmount] = useState("")
  const [section, setSection] = useState<SectionValue>("operations")
  const [kind, setKind] = useState<TransactionKind>("expense")
  const [categories, setCategories] = useState(initialCategories)
  const [category, setCategory] = useState("")

  const monthly = period === "monthly"
  const years = yearOptions(defaultYear)

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

      {/* The period comes first because it decides what the rest of the form
          means: the same category and amount are a different plan in a
          different month. */}
      <FormSection>
        <FormGrid>
          <Field
            label="Period Type"
            htmlFor="period"
            required
            error={errors.period}
            hint="Monthly plans a single month. Yearly plans the whole year."
          >
            <Select
              id="period"
              name="period"
              value={period}
              onValueChange={(value) => setPeriod(value as BudgetPeriod)}
              options={BUDGET_PERIODS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              invalid={Boolean(errors.period)}
            />
          </Field>

          <Field
            label="Period"
            htmlFor={monthly ? "periodMonth" : "periodYear"}
            required
            error={errors.periodMonth ?? errors.periodYear}
          >
            <div className="flex gap-3">
              {monthly ? (
                <div className="min-w-0 flex-[3]">
                  <Select
                    id="periodMonth"
                    name="periodMonth"
                    value={periodMonth}
                    onValueChange={setPeriodMonth}
                    options={MONTH_OPTIONS}
                    invalid={Boolean(errors.periodMonth)}
                  />
                </div>
              ) : null}
              <div className="min-w-0 flex-[2]">
                <Select
                  id="periodYear"
                  name="periodYear"
                  value={periodYear}
                  onValueChange={setPeriodYear}
                  options={years}
                  invalid={Boolean(errors.periodYear)}
                />
              </div>
            </div>
          </Field>
        </FormGrid>

        <p className="mt-5 text-xs text-neutral-500">
          {monthly ? (
            <>
              This budget applies to{" "}
              <span className="font-medium text-neutral-700">
                {longMonthName(Number(periodMonth))} {periodYear}
              </span>
              . The Laporan Keuangan counts it in that month and in the year to
              date once that month is reached.
            </>
          ) : (
            <>
              This budget applies to the whole of{" "}
              <span className="font-medium text-neutral-700">{periodYear}</span>. The
              Laporan Keuangan levels it across the twelve months, so each month
              carries a twelfth of it.
            </>
          )}
        </p>
      </FormSection>

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

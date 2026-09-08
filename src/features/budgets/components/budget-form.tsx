"use client"

import { useActionState, useMemo, useState } from "react"

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
import { FREQUENCIES, SECTIONS, type Frequency } from "@/lib/finance"
import { formatCurrency } from "@/lib/format"
import type { FormState } from "@/lib/form-state"

import { createBudget } from "../actions"
import { buildDistribution } from "../distribution"

const initialState: FormState = {}

export function BudgetForm({ defaultYear }: { defaultYear: number }) {
  const [state, formAction, pending] = useActionState(createBudget, initialState)
  const errors = state.fieldErrors ?? {}

  const [fromYear, setFromYear] = useState(String(defaultYear))
  const [toYear, setToYear] = useState(String(defaultYear))
  const [frequency, setFrequency] = useState<Frequency>("Monthly")
  const [amount, setAmount] = useState("")
  const [distributeEqually, setDistributeEqually] = useState(true)
  const [section, setSection] = useState("operations")

  // Preview of exactly what the server will store, recomputed as you type.
  const rows = useMemo(
    () =>
      distributeEqually
        ? buildDistribution(
            Number(fromYear),
            Number(toYear),
            frequency,
            Number(amount) || 0,
          )
        : [],
    [distributeEqually, fromYear, toYear, frequency, amount],
  )

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
          className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800"
        >
          {state.error}
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

          <Field
            label="Budget Against"
            htmlFor="section"
            required
            error={errors.section}
            hint="The Cash Flow section this budget is measured against."
          >
            <Select
              id="section"
              name="section"
              value={section}
              onValueChange={setSection}
              options={SECTIONS.map((option) => ({ value: option.value, label: option.label }))}
              invalid={Boolean(errors.section)}
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

          <Field label="Category" htmlFor="category" hint="Leave blank to budget the whole section.">
            <TextInput id="category" name="category" placeholder="Optional" />
          </Field>

          <Field
            label="Distribution Frequency"
            htmlFor="frequency"
            required
            error={errors.frequency}
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

          <Field label="Cost Center" htmlFor="costCenter">
            <TextInput id="costCenter" name="costCenter" placeholder="Optional" />
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
        </FormGrid>
      </FormSection>

      <FormSection>
        <CheckboxField
          label="Distribute Equally"
          name="distributeEqually"
          checked={distributeEqually}
          onChange={(event) => setDistributeEqually(event.target.checked)}
          className="mb-5"
        />

        <p className="mb-2 text-sm text-neutral-600">Budget Distribution</p>
        <div className="overflow-x-auto rounded-md border border-black/8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50 text-left text-neutral-600">
                <th scope="col" className="w-14 px-3 py-2.5 font-medium">No.</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Start Date</th>
                <th scope="col" className="px-3 py-2.5 font-medium">End Date</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Amount</th>
                <th scope="col" className="px-3 py-2.5 text-right font-medium">Percent</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                    {distributeEqually
                      ? "Set the fiscal years and a budget amount to generate the periods."
                      : "No rows — untick Distribute Equally to enter periods by hand."}
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.startDate} className="border-t border-black/5">
                    <td className="px-3 py-2.5 text-neutral-400">{index + 1}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{row.startDate}</td>
                    <td className="px-3 py-2.5 text-neutral-700">{row.endDate}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-neutral-900">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-neutral-700">
                      {row.percent}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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

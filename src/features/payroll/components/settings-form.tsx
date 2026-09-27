"use client"

import { useActionState, useState } from "react"

import { Field, MoneyInput, TextInput } from "@/components/form/fields"
import { SaveButton } from "@/components/form/form-shell"
import { useActionToast } from "@/components/ui/toast"
import type { FormState } from "@/lib/form-state"

import { savePayrollSettings } from "../actions"
import { DEFAULT_RATES, type PayrollRates } from "../calculate"

const initialState: FormState = {}

type RateKey = keyof PayrollRates

const SECTIONS: {
  title: string
  description: string
  fields: { key: RateKey; label: string; kind: "percent" | "money"; hint?: string }[]
}[] = [
  {
    title: "Meal Allowance",
    description: "Paid for each day marked present or late in attendance.",
    fields: [{ key: "mealAllowancePerDay", label: "Per day worked", kind: "money" }],
  },
  {
    title: "BPJS Kesehatan",
    description:
      "Taken from basic salary plus fixed allowance, up to the cap. Only for people with a BPJS Kesehatan number on their record.",
    fields: [
      { key: "bpjsKesEmployeeRate", label: "Employee share", kind: "percent", hint: "Taken off the pay." },
      { key: "bpjsKesEmployerRate", label: "Company share", kind: "percent" },
      { key: "bpjsKesWageCap", label: "Wage cap", kind: "money" },
    ],
  },
  {
    title: "BPJS Ketenagakerjaan",
    description:
      "Taken from basic salary plus fixed allowance. Only for people with a BPJS Ketenagakerjaan number on their record.",
    fields: [
      { key: "jhtEmployeeRate", label: "JHT — employee share", kind: "percent", hint: "Taken off the pay." },
      { key: "jhtEmployerRate", label: "JHT — company share", kind: "percent" },
      { key: "jpEmployeeRate", label: "JP — employee share", kind: "percent", hint: "Taken off the pay." },
      { key: "jpEmployerRate", label: "JP — company share", kind: "percent" },
      { key: "jpWageCap", label: "JP wage cap", kind: "money", hint: "Set by BPJS each March." },
      { key: "jkkEmployerRate", label: "JKK — company share", kind: "percent", hint: "0.24% to 1.74% by work risk." },
      { key: "jkmEmployerRate", label: "JKM — company share", kind: "percent" },
    ],
  },
]

/**
 * The rates payroll works from. A draft and any month not yet paid pick up a
 * change the next time they are saved; a final payroll keeps what it was paid on.
 */
export function PayrollSettingsForm({ rates }: { rates: PayrollRates }) {
  const [state, formAction, pending] = useActionState(savePayrollSettings, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(rates).map(([key, value]) => [key, String(value)])),
  )
  const set = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))

  return (
    <form action={formAction} noValidate className="flex flex-col">
      <div className="flex flex-col gap-8 px-4 py-6 sm:px-6">
        {SECTIONS.map((section) => (
          <section key={section.title} className="flex max-w-3xl flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">{section.title}</h2>
              <p className="mt-1 text-sm text-neutral-500">{section.description}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.fields.map((field) => {
                const id = `payroll-setting-${field.key}`
                return (
                  <Field
                    key={field.key}
                    label={field.label}
                    htmlFor={id}
                    required
                    error={errors[field.key]}
                    hint={field.hint ?? `Default ${field.kind === "percent" ? `${DEFAULT_RATES[field.key]}%` : `Rp ${new Intl.NumberFormat("id-ID").format(DEFAULT_RATES[field.key])}`}.`}
                  >
                    {field.kind === "money" ? (
                      <MoneyInput
                        id={id}
                        name={field.key}
                        value={values[field.key] ?? ""}
                        onValueChange={(raw) => set(field.key, raw)}
                        invalid={Boolean(errors[field.key])}
                      />
                    ) : (
                      <div className="relative">
                        <TextInput
                          id={id}
                          name={field.key}
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          value={values[field.key] ?? ""}
                          onChange={(event) => set(field.key, event.target.value.replace(",", "."))}
                          aria-invalid={Boolean(errors[field.key])}
                          className="pr-8 text-right tabular-nums"
                        />
                        <span
                          aria-hidden
                          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-base text-neutral-500 sm:text-sm"
                        >
                          %
                        </span>
                      </div>
                    )}
                  </Field>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-black/8 bg-white px-4 py-3 sm:px-6">
        <p className="text-xs text-neutral-500">A final payroll keeps the rates it was paid on.</p>
        <SaveButton pending={pending}>Save Settings</SaveButton>
      </div>
    </form>
  )
}

"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState, useRef, useState } from "react"
import { ArrowRight, Plus, Trash2 } from "lucide-react"

import { CheckboxField, Field, TextInput } from "@/components/form/fields"
import {
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { Select } from "@/components/form/select"
import { AccountField } from "@/features/accounts/components/account-field"
import type { Account } from "@/features/accounts/actions"
import type { Category } from "@/features/categories/actions"
import { shortMonthName } from "@/features/reporting/months"
import { cn } from "@/lib/cn"
import {
  BUDGET_PERIODS,
  SECTIONS,
  TRANSACTION_KINDS,
  type BudgetPeriod,
  type SectionValue,
  type TransactionKind,
} from "@/lib/finance"
import type { FormState } from "@/lib/form-state"

import { saveBudgetPlan } from "../actions"
import type { PlanRow } from "../plan"

const initialState: FormState = {}

/** The twelve month columns, or the single column a yearly plan fills in. */
const MONTH_SLOTS = Array.from({ length: 12 }, (_, index) => index + 1)
const YEAR_SLOT = [0]

/** A section is a fixed enum value, so it can never contain the separator. */
const optionValue = (section: string, category: string) => `${section}|${category}`

const sectionLabel = (value: string) =>
  SECTIONS.find((section) => section.value === value)?.label ?? value

type Row = {
  /** Stable across re-renders; never sent to the server. */
  key: string
  category: string
  section: SectionValue
  /** Slot to raw digits, e.g. `{ 1: "50000" }`. */
  amounts: Record<number, string>
}

const seedRow = (row: PlanRow, index: number): Row => ({
  key: `seed-${index}`,
  category: row.category,
  section: row.section,
  amounts: Object.fromEntries(
    Object.entries(row.amounts).map(([slot, amount]) => [Number(slot), String(Math.round(amount))]),
  ),
})

const rowTotal = (row: Row) =>
  Object.values(row.amounts).reduce((total, value) => total + (Number(value) || 0), 0)

const money = new Intl.NumberFormat("id-ID")

/**
 * One figure in the grid. Deliberately not `MoneyInput` — twelve of those
 * across a row would each carry an "Rp" prefix and a full-height control, and
 * the grid would be unreadable. The thousands grouping is what matters here.
 */
function AmountCell({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (raw: string) => void
  label: string
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      value={value === "" ? "" : money.format(Number(value))}
      placeholder="0"
      onChange={(event) => onChange(event.target.value.replace(/\D/g, ""))}
      className={cn(
        "h-9 w-full rounded-md bg-neutral-100 px-2 text-right text-sm tabular-nums",
        "text-neutral-900 placeholder:text-neutral-300",
        "focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800",
      )}
    />
  )
}

const iconButton =
  "grid size-8 shrink-0 place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"

export function BudgetGrid({
  account,
  kind,
  period,
  year,
  accounts,
  categories,
  seedRows,
  costCenter: seedCostCenter,
  warnOnOverrun: seedWarn,
  loadError,
  setupError,
}: {
  account: string
  kind: TransactionKind
  period: BudgetPeriod
  year: number
  accounts: Account[]
  categories: Category[]
  seedRows: PlanRow[]
  costCenter: string
  warnOnOverrun: boolean
  /** The plan could not be read — shown instead of pretending it is empty. */
  loadError?: string
  setupError?: string
}) {
  const [state, formAction, pending] = useActionState(saveBudgetPlan, initialState)
  const errors = state.fieldErrors ?? {}

  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [rows, setRows] = useState<Row[]>(() => seedRows.map(seedRow))
  const [costCenter, setCostCenter] = useState(seedCostCenter)
  const [warn, setWarn] = useState(seedWarn)
  const [dirty, setDirty] = useState(false)
  const nextKey = useRef(0)

  const monthly = period === "monthly"
  const slots = monthly ? MONTH_SLOTS : YEAR_SLOT

  /**
   * The header picks which plan is on screen, so it lives in the URL and the
   * rows are re-read on the server. Anything typed and not yet saved belongs
   * to the plan being left, so it is worth a word before it goes.
   */
  function moveTo(entries: Record<string, string>) {
    if (dirty && !window.confirm("Leave this plan? Figures you have not saved will be lost.")) {
      return
    }
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(entries)) params.set(key, value)
    router.replace(`${pathname}?${params}`, { scroll: false })
  }

  function edit(key: string, change: (row: Row) => Row) {
    setDirty(true)
    setRows((current) => current.map((row) => (row.key === key ? change(row) : row)))
  }

  function addRow() {
    setDirty(true)
    nextKey.current += 1
    setRows((current) => [
      ...current,
      { key: `new-${nextKey.current}`, category: "", section: "operations", amounts: {} },
    ])
  }

  function removeRow(key: string) {
    setDirty(true)
    setRows((current) => current.filter((row) => row.key !== key))
  }

  /** Copies the row's leftmost figure into every empty month to its right. */
  function fillAcross(key: string) {
    edit(key, (row) => {
      const first = MONTH_SLOTS.find((slot) => row.amounts[slot])
      if (!first) return row
      const value = row.amounts[first]
      const amounts = { ...row.amounts }
      for (const slot of MONTH_SLOTS) {
        if (slot > first && !amounts[slot]) amounts[slot] = value
      }
      return { ...row, amounts }
    })
  }

  // Categories belong to one direction, so only this side's are offered. A
  // seeded row whose category has since been deleted keeps an option of its
  // own, or picking anything else in that row would be the only way out.
  const options = categories
    .filter((category) => category.kind === kind)
    .map((category) => ({
      value: optionValue(category.section, category.name),
      label: `${category.name} · ${sectionLabel(category.section)}`,
    }))

  const optionsFor = (row: Row) => {
    if (!row.category) return options
    const value = optionValue(row.section, row.category)
    if (options.some((option) => option.value === value)) return options
    return [{ value, label: `${row.category} · ${sectionLabel(row.section)} (deleted)` }, ...options]
  }

  const columnTotal = (slot: number) =>
    rows.reduce((total, row) => total + (Number(row.amounts[slot]) || 0), 0)
  const grandTotal = rows.reduce((total, row) => total + rowTotal(row), 0)

  const columns = 1 + slots.length + 2

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <FormHeader
        crumbs={[{ label: "Anggaran", href: "/budgets" }]}
        title="Budget Plan"
        status={dirty ? <NotSavedBadge /> : undefined}
        action={<SaveButton pending={pending}>Save plan</SaveButton>}
      />

      {/* The header choices travel as fields as well as in the URL: the action
          reads them from the form, not from the address bar. */}
      <input type="hidden" name="account" value={account} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="year" value={year} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(
          rows.map((row) => ({
            category: row.category,
            section: row.section,
            amounts: row.amounts,
          })),
        )}
      />

      {state.message ? (
        <p role="status" className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 sm:px-6">
          {state.message}
        </p>
      ) : null}

      {state.error ?? errors.lines ? (
        <p role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:px-6">
          {state.error ?? errors.lines}
        </p>
      ) : null}

      {loadError ?? setupError ? (
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {loadError ?? setupError}
        </p>
      ) : null}

      <FormSection>
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field
            label="Account"
            htmlFor="account-picker"
            required
            error={errors.account}
            hint="The pot this plan is drawn on."
          >
            <AccountField
              id="account-picker"
              value={account}
              onValueChange={(value) => moveTo({ account: value })}
              accounts={accounts}
              invalid={Boolean(errors.account)}
            />
          </Field>

          <Field label="Type" htmlFor="kind-picker" required error={errors.kind}>
            <Select
              id="kind-picker"
              value={kind}
              onValueChange={(value) => moveTo({ kind: value })}
              options={TRANSACTION_KINDS.map((entry) => ({
                value: entry.value,
                label: entry.label,
              }))}
              invalid={Boolean(errors.kind)}
            />
          </Field>

          <Field
            label="Period Type"
            htmlFor="period-picker"
            required
            error={errors.period}
            hint="Monthly fills each month. Yearly is one figure for the year."
          >
            <Select
              id="period-picker"
              value={period}
              onValueChange={(value) => moveTo({ period: value })}
              options={BUDGET_PERIODS.map((entry) => ({
                value: entry.value,
                label: entry.label,
              }))}
              invalid={Boolean(errors.period)}
            />
          </Field>

          <Field label="Year" htmlFor="year-picker" required error={errors.year}>
            <Select
              id="year-picker"
              value={String(year)}
              onValueChange={(value) => moveTo({ year: value })}
              options={Array.from({ length: 11 }, (_, index) => {
                const option = String(year - 5 + index)
                return { value: option, label: option }
              })}
              invalid={Boolean(errors.year)}
            />
          </Field>
        </div>

        <p className="mt-5 text-xs text-neutral-500">
          {account ? (
            <>
              Saving replaces every{" "}
              <span className="font-medium text-neutral-700">
                {monthly ? "monthly" : "yearly"}
              </span>{" "}
              {kind} plan on{" "}
              <span className="font-medium text-neutral-700">{account}</span> for{" "}
              <span className="font-medium text-neutral-700">{year}</span> with what is in
              the grid — clearing a cell is how a plan is removed.
            </>
          ) : (
            "Choose an account to start. Each account is planned separately."
          )}
        </p>
      </FormSection>

      <FormSection className="px-0 sm:px-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              {monthly
                ? `Budget for each month of ${year}, one row per category`
                : `Budget for the whole of ${year}, one row per category`}
            </caption>
            <thead>
              <tr className="bg-neutral-50">
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-[220px] bg-neutral-50 px-3 py-2.5 text-left font-medium text-neutral-700"
                >
                  Category
                </th>
                {slots.map((slot) => (
                  <th
                    key={slot}
                    scope="col"
                    className="min-w-[112px] px-1.5 py-2.5 text-right font-medium text-neutral-700"
                  >
                    {slot === 0 ? "Amount" : shortMonthName(slot)}
                  </th>
                ))}
                <th scope="col" className="min-w-[130px] px-3 py-2.5 text-right font-medium text-neutral-700">
                  Total
                </th>
                <th scope="col" className="w-20 px-2 py-2.5">
                  <span className="sr-only">Row actions</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-black/5">
                  <td className="sticky left-0 z-10 bg-white px-3 py-1.5">
                    <Select
                      id={`category-${row.key}`}
                      value={row.category ? optionValue(row.section, row.category) : ""}
                      onValueChange={(value) => {
                        const [section, ...rest] = value.split("|")
                        edit(row.key, (current) => ({
                          ...current,
                          section: section as SectionValue,
                          category: rest.join("|"),
                        }))
                      }}
                      options={optionsFor(row)}
                      placeholder={
                        options.length === 0 ? `No ${kind} categories yet` : "Select a category…"
                      }
                    />
                  </td>

                  {slots.map((slot) => (
                    <td key={slot} className="px-1.5 py-1.5">
                      <AmountCell
                        value={row.amounts[slot] ?? ""}
                        onChange={(raw) =>
                          edit(row.key, (current) => ({
                            ...current,
                            amounts: { ...current.amounts, [slot]: raw },
                          }))
                        }
                        label={`${row.category || "Row"} — ${slot === 0 ? year : shortMonthName(slot)}`}
                      />
                    </td>
                  ))}

                  <td className="px-3 py-1.5 text-right font-medium tabular-nums text-neutral-900">
                    {money.format(rowTotal(row))}
                  </td>

                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-0.5">
                      {monthly ? (
                        <button
                          type="button"
                          onClick={() => fillAcross(row.key)}
                          title="Fill this figure across the rest of the year"
                          aria-label={`Fill ${row.category || "this row"} across the rest of the year`}
                          className={iconButton}
                        >
                          <ArrowRight className="size-4" strokeWidth={1.75} />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => removeRow(row.key)}
                        aria-label={`Remove ${row.category || "this row"}`}
                        className={cn(iconButton, "hover:text-rose-600")}
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              <tr className="border-t border-black/5">
                <td colSpan={columns} className="sticky left-0 px-3 py-2">
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    <Plus className="size-4 text-neutral-500" strokeWidth={2} />
                    Add a category
                  </button>
                </td>
              </tr>
            </tbody>

            {rows.length > 0 ? (
              <tfoot>
                <tr className="border-t border-black/15 bg-neutral-50 font-semibold text-neutral-900">
                  <td className="sticky left-0 z-10 bg-neutral-50 px-3 py-2.5">Total</td>
                  {slots.map((slot) => (
                    <td key={slot} className="px-1.5 py-2.5 text-right tabular-nums">
                      {money.format(columnTotal(slot))}
                    </td>
                  ))}
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {money.format(grandTotal)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </FormSection>

      <FormSection title="Applies to every row" className="border-b-0">
        <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <Field
            label="Cost Center"
            htmlFor="costCenter"
            hint="Department or project these plans belong to."
          >
            <TextInput
              id="costCenter"
              name="costCenter"
              value={costCenter}
              onChange={(event) => {
                setDirty(true)
                setCostCenter(event.target.value)
              }}
              placeholder="Optional"
            />
          </Field>

          <CheckboxField
            label="Warn when actuals exceed these budgets"
            hint="Shown on the Cash Flow report; it does not block anything."
            name="warnOnOverrun"
            checked={warn}
            onChange={(event) => {
              setDirty(true)
              setWarn(event.target.checked)
            }}
          />
        </div>
      </FormSection>
    </form>
  )
}

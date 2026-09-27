"use client"

import Link from "next/link"
import { useActionState, useState, type ReactNode } from "react"
import { FileText, Lock } from "lucide-react"

import { MoneyInput } from "@/components/form/fields"
import { useActionToast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import { formatCurrency, formatDate } from "@/lib/format"
import type { FormState } from "@/lib/form-state"

import { reopenPayroll, savePayroll } from "../actions"
import {
  bpjsTkEmployee,
  calculatePay,
  PAY_INPUTS,
  type PayFigures,
  type PayInputs,
  type PayrollRates,
} from "../calculate"
import { DEFAULT_PAYROLL_COLUMNS, PAYROLL_COLUMNS, type PayrollColumnKey } from "../columns"
import type { PayrollEmployee, PayrollRun, Payslip } from "../data"

const initialState: FormState = {}

const headCell = "px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap text-neutral-700"
const numberHead = cn(headCell, "text-right")
const cell = "px-3 py-2 text-sm"
const numberCell = cn(cell, "text-right whitespace-nowrap text-neutral-700 tabular-nums")
/** The name column stays put while the figures scroll under it on a phone. */
const stickyHead = cn(headCell, "sticky left-0 z-10 min-w-[180px] bg-neutral-50")
const stickyCell = cn(cell, "sticky left-0 z-10 min-w-[180px] bg-white")

type InputKey = keyof PayInputs

const INPUT_KEYS = PAY_INPUTS.map((input) => input.key) as InputKey[]
const isInput = (key: PayrollColumnKey): key is InputKey => INPUT_KEYS.includes(key as InputKey)

/** An amount, or a dash for nothing — a sheet of zeros is hard to read. */
const money = (value: number) => (value === 0 ? "—" : formatCurrency(value))

const inputName = (key: InputKey, employeeId: string) => `${key}:${employeeId}`

type Line = {
  employee: PayrollEmployee
  figures: PayFigures
  payslipId: string | null
  /** Why a figure the sheet worked out may not be what was meant. */
  warning: string | null
}

function warningFor(employee: PayrollEmployee): string | null {
  if (employee.employmentType === "daily_worker") {
    return employee.dailyRate ? null : "No daily rate on file"
  }
  return employee.basicSalary > 0 ? null : "No basic salary on file"
}

/** How each optional column heads, fills and totals. Typed-in columns are drawn apart. */
function columnSpec(key: Exclude<PayrollColumnKey, InputKey>, rates: PayrollRates) {
  const specs: Record<
    Exclude<PayrollColumnKey, InputKey>,
    {
      title?: string
      numeric: boolean
      value: (line: Line) => ReactNode
      hint?: (line: Line) => string | undefined
      total: (lines: Line[]) => ReactNode
    }
  > = {
    department: {
      numeric: false,
      value: (line) => line.employee.department ?? "—",
      total: () => null,
    },
    workingDays: {
      title: "Days marked present or late",
      numeric: true,
      value: (line) => line.figures.workingDays,
      total: (lines) => lines.reduce((sum, line) => sum + line.figures.workingDays, 0),
    },
    basicSalary: {
      numeric: true,
      value: (line) => money(line.figures.basicSalary),
      hint: (line) =>
        line.figures.dailyRate !== null
          ? `${line.figures.workingDays} days × ${formatCurrency(line.figures.dailyRate)}`
          : undefined,
      total: (lines) => money(sum(lines, (f) => f.basicSalary)),
    },
    fixedAllowance: {
      numeric: true,
      value: (line) => money(line.figures.fixedAllowance),
      total: (lines) => money(sum(lines, (f) => f.fixedAllowance)),
    },
    mealAllowance: {
      title: `Days × ${formatCurrency(rates.mealAllowancePerDay)}`,
      numeric: true,
      value: (line) => money(line.figures.mealAllowance),
      total: (lines) => money(sum(lines, (f) => f.mealAllowance)),
    },
    grossPay: {
      numeric: true,
      value: (line) => money(line.figures.grossPay),
      total: (lines) => money(sum(lines, (f) => f.grossPay)),
    },
    bpjsTk: {
      title: "JHT and JP, the employee's share",
      numeric: true,
      value: (line) => money(bpjsTkEmployee(line.figures)),
      hint: (line) =>
        !line.payslipId && !line.employee.bpjsKetenagakerjaan
          ? "No BPJS Ketenagakerjaan number on file"
          : undefined,
      total: (lines) => money(sum(lines, bpjsTkEmployee)),
    },
    bpjsKes: {
      title: "The employee's share",
      numeric: true,
      value: (line) => money(line.figures.bpjsKesEmployee),
      hint: (line) =>
        !line.payslipId && !line.employee.bpjsKesehatan ? "No BPJS Kesehatan number on file" : undefined,
      total: (lines) => money(sum(lines, (f) => f.bpjsKesEmployee)),
    },
  }
  return specs[key]
}

const sum = (lines: Line[], pick: (figures: PayFigures) => number) =>
  lines.reduce((total, line) => total + pick(line.figures), 0)

/**
 * The month's pay, one row a person. Salary comes off the employee record,
 * days worked off attendance, and BPJS off Payroll Settings; THR, service
 * charge, other allowances, bonus and other deductions are typed in here.
 * Figures follow the boxes as they are typed, and the save works them out
 * again from what is on file.
 *
 * Only the rows on show are saved, so a filtered sheet leaves everyone else as
 * they were. A typed-in column that is hidden still sends its amounts, so
 * hiding one never wipes them.
 *
 * Once final the sheet shows what was paid, and nothing on it changes until it
 * is reopened.
 */
export function PayrollSheet({
  period,
  run,
  employees,
  workingDays,
  payslips,
  rates,
  columns = DEFAULT_PAYROLL_COLUMNS,
  filtered = false,
}: {
  /** `YYYY-MM-01`. */
  period: string
  run: PayrollRun | null
  /** The rows on show, already narrowed and ordered. */
  employees: PayrollEmployee[]
  workingDays: Record<string, number>
  /** Keyed by employee id. */
  payslips: Record<string, Payslip>
  rates: PayrollRates
  /** Which optional columns to show, in the order they appear. */
  columns?: PayrollColumnKey[]
  /** Whether a search or filter is narrowing the rows. */
  filtered?: boolean
}) {
  const [state, formAction, pending] = useActionState(savePayroll, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  const locked = run?.status === "final"

  // Only what has been typed is held here: an action resets uncontrolled
  // fields, and the figures follow the boxes. Anything untouched reads from
  // the saved payslip, so a row a filter brings back starts from what is on file.
  const [values, setValues] = useState<Record<string, string>>({})
  const valueOf = (key: InputKey, employeeId: string) => {
    const typed = values[inputName(key, employeeId)]
    if (typed !== undefined) return typed
    const saved = payslips[employeeId]?.[key] ?? 0
    return saved > 0 ? String(saved) : ""
  }
  const inputsOf = (employeeId: string): PayInputs => {
    const read = (key: InputKey) => Number(valueOf(key, employeeId) || 0)
    return {
      thr: read("thr"),
      serviceCharge: read("serviceCharge"),
      otherAllowance: read("otherAllowance"),
      bonus: read("bonus"),
      otherDeduction: read("otherDeduction"),
    }
  }

  // A final month shows what was paid; a draft works it out from what is on file now.
  const lines: Line[] = employees.flatMap((employee) => {
    const payslip = payslips[employee.id]
    if (locked) {
      return payslip ? [{ employee, figures: payslip, payslipId: payslip.id, warning: null }] : []
    }
    return [
      {
        employee,
        figures: calculatePay(
          { ...employee, workingDays: workingDays[employee.id] ?? 0 },
          inputsOf(employee.id),
          rates,
        ),
        payslipId: payslip?.id ?? null,
        warning: warningFor(employee),
      },
    ]
  })

  const hiddenInputs = INPUT_KEYS.filter((key) => !columns.includes(key))
  const label = (key: PayrollColumnKey) =>
    PAYROLL_COLUMNS.find((column) => column.key === key)?.label ?? key

  if (lines.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-neutral-500 sm:px-6">
        {filtered
          ? "Nobody matches these filters."
          : locked
            ? "Nobody was paid in this payroll."
            : "Nobody is on the roll yet. Add an employee first."}
      </p>
    )
  }

  const table = (
    <table className="w-full border-collapse">
      <caption className="sr-only">
        Pay for every employee shown this month: earnings, deductions and net pay.
      </caption>
      <thead>
        <tr className="bg-neutral-50">
          <th scope="col" className={stickyHead}>Employee</th>
          {columns.map((key) => {
            const numeric = isInput(key) || columnSpec(key, rates).numeric
            return (
              <th
                key={key}
                scope="col"
                className={numeric ? numberHead : headCell}
                title={isInput(key) ? undefined : columnSpec(key, rates).title}
              >
                {label(key)}
              </th>
            )
          })}
          <th scope="col" className={numberHead}>Net Pay</th>
          <th scope="col" className={cn(headCell, "w-10")}>
            <span className="sr-only">Payslip</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {lines.map((line) => {
          const { employee, figures, payslipId, warning } = line

          return (
            <tr key={employee.id} className="border-t border-black/5">
              <td className={stickyCell}>
                {locked ? null : (
                  <>
                    <input type="hidden" name="employeeId" value={employee.id} />
                    {hiddenInputs.map((key) => (
                      <input
                        key={key}
                        type="hidden"
                        name={inputName(key, employee.id)}
                        value={valueOf(key, employee.id)}
                      />
                    ))}
                  </>
                )}
                <Link
                  href={`/hris/employees/${employee.id}?tab=salary`}
                  title="Open their salary details"
                  className="block text-neutral-900 underline-offset-2 hover:underline"
                >
                  {employee.fullName}
                </Link>
                <span className="block text-xs text-neutral-500">
                  {employee.employeeNo}
                  {employee.department && !columns.includes("department") ? ` · ${employee.department}` : ""}
                  {employee.employmentType === "daily_worker" ? " · Daily" : ""}
                </span>
                {warning ? <span className="block text-xs text-amber-700">{warning}</span> : null}
              </td>

              {columns.map((key) => {
                if (isInput(key)) {
                  const name = inputName(key, employee.id)
                  if (locked) {
                    return (
                      <td key={key} className={numberCell}>
                        {money(figures[key])}
                      </td>
                    )
                  }
                  return (
                    <td key={key} className={cell}>
                      <div className="w-36">
                        <MoneyInput
                          id={`payroll-${name}`}
                          name={name}
                          value={valueOf(key, employee.id)}
                          onValueChange={(raw) => setValues((current) => ({ ...current, [name]: raw }))}
                          invalid={Boolean(errors[name])}
                        />
                      </div>
                      {errors[name] ? <p className="mt-1 text-xs text-rose-600">{errors[name]}</p> : null}
                    </td>
                  )
                }

                const spec = columnSpec(key, rates)
                return (
                  <td
                    key={key}
                    className={cn(spec.numeric ? numberCell : cell, key === "grossPay" && "text-neutral-900")}
                    title={spec.hint?.(line)}
                  >
                    {spec.value(line)}
                  </td>
                )
              })}

              <td
                className={cn(
                  numberCell,
                  "font-medium",
                  figures.netPay < 0 ? "text-rose-600" : "text-neutral-900",
                )}
              >
                {formatCurrency(figures.netPay)}
              </td>
              <td className={cn(cell, "text-center")}>
                {payslipId ? (
                  <Link
                    href={`/hris/payslip/${payslipId}`}
                    aria-label={`Payslip for ${employee.fullName}`}
                    title="Payslip"
                    className="inline-grid size-8 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                  >
                    <FileText className="size-4" strokeWidth={1.75} />
                  </Link>
                ) : null}
              </td>
            </tr>
          )
        })}
      </tbody>

      <tfoot>
        <tr className="border-t border-black/12 bg-neutral-50 font-medium">
          <th scope="row" className={cn(stickyCell, "bg-neutral-50 text-left text-neutral-900")}>
            {filtered ? "Total shown" : "Total"}
          </th>
          {columns.map((key) => (
            <td key={key} className={numberCell}>
              {isInput(key) ? money(sum(lines, (f) => f[key])) : columnSpec(key, rates).total(lines)}
            </td>
          ))}
          <td className={cn(numberCell, "text-neutral-900")}>
            {formatCurrency(sum(lines, (f) => f.netPay))}
          </td>
          <td />
        </tr>
      </tfoot>
    </table>
  )

  if (locked) {
    return (
      <>
        {table}
        <ReopenBar run={run} />
      </>
    )
  }

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="period" value={period} />
      {table}

      <div className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-black/8 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-neutral-500">
          {filtered
            ? "Only the people shown are saved; everyone else stays as they were."
            : run
              ? "Draft. Salary, days worked and BPJS are read again each time it is saved."
              : "Not saved yet. Saving creates this month's payslips as a draft."}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="submit"
            name="intent"
            value="save"
            disabled={pending}
            className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md border border-black/10 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-8 sm:flex-none"
          >
            {pending ? "Saving…" : "Save Draft"}
          </button>
          <button
            type="submit"
            name="intent"
            value="finalize"
            disabled={pending || filtered}
            title={filtered ? "Clear the search and filters to finalize the whole month." : undefined}
            onClick={(event) => {
              if (!window.confirm("Finalize this payroll? It is locked until reopened.")) {
                event.preventDefault()
              }
            }}
            className="inline-flex h-9 flex-1 cursor-pointer items-center justify-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-40 sm:h-8 sm:flex-none"
          >
            Finalize
          </button>
        </div>
      </div>
    </form>
  )
}

/** A final month's foot: when it was locked, and the way to unlock it. */
function ReopenBar({ run }: { run: PayrollRun }) {
  const [state, formAction, pending] = useActionState(reopenPayroll, initialState)
  useActionToast(state)

  return (
    <form
      action={formAction}
      className="sticky bottom-0 z-20 flex flex-col gap-3 border-t border-black/8 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
    >
      <input type="hidden" name="runId" value={run.id} />
      <p className="flex items-center gap-1.5 text-xs text-neutral-500">
        <Lock className="size-3.5 shrink-0" strokeWidth={1.75} />
        Final{run.finalizedAt ? ` since ${formatDate(run.finalizedAt.slice(0, 10))}` : ""}. Nothing
        on it changes until it is reopened.
      </p>
      <button
        type="submit"
        disabled={pending}
        onClick={(event) => {
          if (!window.confirm("Reopen this payroll as a draft? Saving it again re-reads salary, attendance and rates.")) {
            event.preventDefault()
          }
        }}
        className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-black/10 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:pointer-events-none disabled:opacity-40 sm:h-8"
      >
        {pending ? "Reopening…" : "Reopen"}
      </button>
    </form>
  )
}

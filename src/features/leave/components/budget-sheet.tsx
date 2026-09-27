"use client"

import { useActionState, useState } from "react"

import { TextInput } from "@/components/form/fields"
import { SaveButton } from "@/components/form/form-shell"
import { useActionToast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import type { FormState } from "@/lib/form-state"
import type { RosterEntry } from "@/features/employees/roster"

import { saveLeaveBudgets } from "../budget-actions"
import type { LeaveBudget } from "../budgets"
import { formatDays } from "../constants"

const initialState: FormState = {}

const headCell = "px-3 py-2.5 text-left text-sm font-medium whitespace-nowrap text-neutral-700"
const numberHead = cn(headCell, "text-right")
const cell = "px-3 py-2 text-sm"
const numberCell = cn(cell, "text-right text-neutral-700 tabular-nums")

/**
 * Everyone's budget of one leave type for one year, typed in per person. One
 * Save writes the sheet. "Set everyone to" fills every box at once, for when
 * the rule is the same for all — then change the odd one by hand.
 */
export function BudgetSheet({
  year,
  leaveTypeId,
  roster,
  budgets,
}: {
  year: number
  leaveTypeId: string
  roster: RosterEntry[]
  /** What is on file for this type and year, keyed by employee id. */
  budgets: Record<string, LeaveBudget>
}) {
  const [state, formAction, pending] = useActionState(saveLeaveBudgets, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  // Held in state: an action resets uncontrolled fields, and "Set everyone
  // to" has to write into every box.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      roster.map((employee) => {
        const budget = budgets[employee.id]
        return [employee.id, budget ? String(budget.days) : ""]
      }),
    ),
  )
  const [everyone, setEveryone] = useState("")

  if (roster.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-neutral-500 sm:px-6">
        Nobody is on the roll yet. Add an employee first.
      </p>
    )
  }

  function fillAll() {
    setValues(Object.fromEntries(roster.map((employee) => [employee.id, everyone.trim()])))
  }

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="leaveTypeId" value={leaveTypeId} />

      <div className="flex flex-wrap items-center gap-2 border-b border-black/8 px-4 py-3 sm:px-6">
        <label htmlFor="budget-everyone" className="text-sm text-neutral-600">
          Set everyone to
        </label>
        <TextInput
          id="budget-everyone"
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={everyone}
          onChange={(event) => setEveryone(event.target.value)}
          onKeyDown={(event) => {
            // Enter fills the boxes rather than saving the sheet.
            if (event.key === "Enter") {
              event.preventDefault()
              fillAll()
            }
          }}
          placeholder="12"
          className="w-24"
        />
        <span className="text-sm text-neutral-600">days</span>
        <button
          type="button"
          onClick={fillAll}
          className="inline-flex h-10 cursor-pointer items-center rounded-md border border-black/10 px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Apply
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">
            Leave budget for every employee on the roll, with what is taken and left.
          </caption>
          <thead>
            <tr className="bg-neutral-50">
              <th scope="col" className={cn("min-w-[200px]", headCell)}>Employee</th>
              <th scope="col" className={cn("w-32", headCell)}>Budget</th>
              <th scope="col" className={numberHead}>Taken</th>
              <th scope="col" className={numberHead}>Pending</th>
              <th scope="col" className={numberHead}>Left</th>
            </tr>
          </thead>

          <tbody>
            {roster.map((employee) => {
              const budget = budgets[employee.id]
              const taken = budget?.taken ?? 0
              const waiting = budget?.pending ?? 0
              const raw = values[employee.id] ?? ""
              // Left follows the box as it is typed in, not only once saved.
              const typed = raw === "" ? null : Number(raw)
              const left = typed === null || Number.isNaN(typed) ? null : typed - taken
              const error = errors[`days:${employee.id}`]

              return (
                <tr key={employee.id} className="border-t border-black/5">
                  <td className={cell}>
                    <input type="hidden" name="employeeId" value={employee.id} />
                    <span className="block text-neutral-900">{employee.fullName}</span>
                    <span className="block text-xs text-neutral-500">
                      {employee.employeeNo}
                      {employee.department ? ` · ${employee.department}` : ""}
                    </span>
                  </td>
                  <td className={cell}>
                    <TextInput
                      aria-label={`Budget for ${employee.fullName}`}
                      name={`days:${employee.id}`}
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={raw}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [employee.id]: event.target.value }))
                      }
                      placeholder="No limit"
                      aria-invalid={Boolean(error)}
                      className="w-28"
                    />
                    {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : null}
                  </td>
                  <td className={numberCell}>{formatDays(taken)}</td>
                  <td className={numberCell}>{waiting > 0 ? formatDays(waiting) : "—"}</td>
                  <td
                    className={cn(
                      numberCell,
                      "font-medium",
                      left === null
                        ? "text-neutral-400"
                        : left - waiting < 0
                          ? "text-rose-600"
                          : "text-neutral-900",
                    )}
                  >
                    {left === null ? "—" : formatDays(left)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-black/8 bg-white px-4 py-3 sm:px-6">
        <p className="text-xs text-neutral-500">Empty means no limit for that person.</p>
        <SaveButton pending={pending}>Save Budgets</SaveButton>
      </div>
    </form>
  )
}

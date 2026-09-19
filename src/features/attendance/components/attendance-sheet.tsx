"use client"

import { useActionState, useState } from "react"

import { Select } from "@/components/form/select"
import { TextInput } from "@/components/form/fields"
import { SaveButton } from "@/components/form/form-shell"
import { useActionToast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import type { FormState } from "@/lib/form-state"

import { saveAttendanceDay, type AttendanceEntry } from "../actions"
import { ATTENDANCE_STATUSES, NON_WORKING, type AttendanceStatusValue } from "../constants"
import type { RosterEntry } from "@/features/employees/roster"

const initialState: FormState = {}

const headCell = "px-3 py-2.5 text-left text-sm font-medium text-neutral-700"
const cell = "px-3 py-2"

/** "Not recorded" is a real choice on the sheet: picking it clears the day. */
const STATUS_OPTIONS = [{ value: "", label: "— Not recorded" }, ...ATTENDANCE_STATUSES]

const BLANK: AttendanceEntry = {
  employeeId: "",
  status: "",
  checkIn: "",
  checkOut: "",
  note: "",
}

/**
 * The day's roll call: every employee still on the roll, with what they did on
 * the chosen date. One Save writes the whole sheet, because taking attendance
 * is one job done once a day rather than a row at a time.
 */
export function AttendanceSheet({
  date,
  roster,
  entries,
}: {
  /** ISO `YYYY-MM-DD`, chosen in the toolbar above. */
  date: string
  roster: RosterEntry[]
  /** What is already on file for that date, keyed by employee id. */
  entries: Record<string, AttendanceEntry>
}) {
  const [state, formAction, pending] = useActionState(saveAttendanceDay, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  if (roster.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-neutral-500 sm:px-6">
        Nobody is on the roll yet. Add an employee first.
      </p>
    )
  }

  return (
    // Keyed on the date so moving to another day starts from that day's values
    // rather than keeping the ones on screen.
    <form key={date} action={formAction} noValidate>
      <input type="hidden" name="date" value={date} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">
            Attendance for every employee on the roll, for the chosen date.
          </caption>
          <thead>
            <tr className="bg-neutral-50">
              <th scope="col" className={cn("min-w-[200px]", headCell)}>Employee</th>
              <th scope="col" className={cn("min-w-[170px]", headCell)}>Status</th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>Check In</th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>Check Out</th>
              <th scope="col" className={cn("min-w-[200px]", headCell)}>Note</th>
            </tr>
          </thead>

          <tbody>
            {roster.map((employee) => (
              <AttendanceRow
                key={employee.id}
                employee={employee}
                entry={entries[employee.id] ?? BLANK}
                errors={errors}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="sticky bottom-0 flex justify-end border-t border-black/8 bg-white px-4 py-3 sm:px-6">
        <SaveButton pending={pending}>Save Day</SaveButton>
      </div>
    </form>
  )
}

/** One person's line. Holds its own status, since the clocks follow it. */
function AttendanceRow({
  employee,
  entry,
  errors,
}: {
  employee: RosterEntry
  entry: AttendanceEntry
  errors: Record<string, string>
}) {
  const [status, setStatus] = useState<string>(entry.status)
  // A day off has no hours on it, so the clocks step aside rather than sit
  // there collecting values the save would drop.
  const clocked = Boolean(status) && !NON_WORKING.includes(status as AttendanceStatusValue)

  const error = (name: string) => errors[`${name}:${employee.id}`]

  return (
    <tr className="border-t border-black/5">
      <td className={cn(cell, "align-middle")}>
        <input type="hidden" name="employeeId" value={employee.id} />
        <span className="block text-sm text-neutral-900">{employee.fullName}</span>
        <span className="block text-xs text-neutral-500">
          {employee.employeeNo}
          {employee.department ? ` · ${employee.department}` : ""}
        </span>
      </td>

      <td className={cell}>
        <Select
          id={`status:${employee.id}`}
          name={`status:${employee.id}`}
          value={status}
          onValueChange={setStatus}
          options={STATUS_OPTIONS}
          invalid={Boolean(error("status"))}
        />
        {error("status") ? (
          <p className="mt-1 text-xs text-rose-600">{error("status")}</p>
        ) : null}
      </td>

      <td className={cell}>
        {clocked ? (
          <>
            <TextInput
              type="time"
              aria-label={`Check in for ${employee.fullName}`}
              name={`checkIn:${employee.id}`}
              defaultValue={entry.checkIn}
              aria-invalid={Boolean(error("checkIn"))}
            />
            {error("checkIn") ? (
              <p className="mt-1 text-xs text-rose-600">{error("checkIn")}</p>
            ) : null}
          </>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        )}
      </td>

      <td className={cell}>
        {clocked ? (
          <>
            <TextInput
              type="time"
              aria-label={`Check out for ${employee.fullName}`}
              name={`checkOut:${employee.id}`}
              defaultValue={entry.checkOut}
              aria-invalid={Boolean(error("checkOut"))}
            />
            {error("checkOut") ? (
              <p className="mt-1 text-xs text-rose-600">{error("checkOut")}</p>
            ) : null}
          </>
        ) : (
          <span className="text-sm text-neutral-400">—</span>
        )}
      </td>

      <td className={cell}>
        <TextInput
          aria-label={`Note for ${employee.fullName}`}
          name={`note:${employee.id}`}
          defaultValue={entry.note}
          autoComplete="off"
          maxLength={200}
          placeholder="Optional"
          aria-invalid={Boolean(error("note"))}
        />
        {error("note") ? <p className="mt-1 text-xs text-rose-600">{error("note")}</p> : null}
      </td>
    </tr>
  )
}

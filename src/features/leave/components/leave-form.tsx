"use client"

import { useActionState, useState } from "react"

import { DatePicker } from "@/components/form/date-picker"
import { Field, TextArea } from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { Select } from "@/components/form/select"
import { useActionToast } from "@/components/ui/toast"
import type { FormState } from "@/lib/form-state"
import type { RosterEntry } from "@/features/employees/roster"

import { recordLeave } from "../actions"
import type { LeaveBudget } from "../budgets"
import { formatDays, LEAVE_STATUSES, leaveDays, leaveDaysInYear } from "../constants"
import { ManageTypesFooter } from "./manage-types-footer"

const initialState: FormState = {}

/**
 * The budget line under the type, for the year the first day falls in. The
 * database has the final say when saving (0029 §3); this is so nobody has to
 * find out by trying.
 */
function budgetHint(
  budgets: LeaveBudget[],
  employeeId: string,
  type: { id: string; name: string } | undefined,
  startDate: string,
  endDate: string,
): { text: string; over: boolean } | undefined {
  if (!employeeId || !type || !startDate) return undefined

  const year = Number(startDate.slice(0, 4))
  const budget = budgets.find(
    (entry) =>
      entry.employeeId === employeeId && entry.leaveTypeId === type.id && entry.year === year,
  )
  const label = type.name.toLowerCase()
  if (!budget) return { text: `No ${label} budget set for ${year} — not limited.`, over: false }

  const available = budget.days - budget.taken - budget.pending
  const wanted = leaveDaysInYear(startDate, endDate, year)
  const pendingNote = budget.pending > 0 ? `, ${formatDays(budget.pending)} pending` : ""
  return {
    text: `${formatDays(Math.max(available, 0))} of ${formatDays(budget.days)} ${label} days left in ${year}${pendingNote}.`,
    over: wanted > available,
  }
}

/** One spell of leave, for anyone on the roll. */
export function LeaveForm({
  roster,
  types,
  budgets,
  today,
}: {
  roster: RosterEntry[]
  /** The leave types to choose from, as set up under Leave Types. */
  types: { id: string; name: string }[]
  /** Budgets for this year and next, with what is drawn on each. */
  budgets: LeaveBudget[]
  today: string
}) {
  const [state, formAction, pending] = useActionState(recordLeave, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  const [employeeId, setEmployeeId] = useState("")
  const [leaveTypeId, setLeaveTypeId] = useState(types[0]?.id ?? "")
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [status, setStatus] = useState("pending")

  const days = leaveDays(startDate, endDate)
  const budget = budgetHint(
    budgets,
    employeeId,
    types.find((type) => type.id === leaveTypeId),
    startDate,
    endDate,
  )

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <FormHeader
        crumbs={[{ label: "Leave", href: "/hris/leave" }]}
        title="Record Leave"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />

      <FormSection title="Leave" className="border-b-0">
        <FormGrid>
          <Field label="Employee" htmlFor="employeeId" required error={errors.employeeId}>
            <Select
              id="employeeId"
              name="employeeId"
              value={employeeId}
              onValueChange={setEmployeeId}
              options={roster.map((employee) => ({
                value: employee.id,
                label: `${employee.fullName} · ${employee.employeeNo}`,
              }))}
              placeholder={roster.length === 0 ? "Nobody on the roll yet" : "Choose an employee"}
              invalid={Boolean(errors.employeeId)}
            />
          </Field>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Field label="Type" htmlFor="leaveTypeId" required error={errors.leaveTypeId}>
              <Select
                id="leaveTypeId"
                name="leaveTypeId"
                value={leaveTypeId}
                onValueChange={setLeaveTypeId}
                options={types.map((type) => ({ value: type.id, label: type.name }))}
                placeholder={types.length === 0 ? "No leave types yet" : "Choose a type"}
                invalid={Boolean(errors.leaveTypeId)}
                footer={() => <ManageTypesFooter />}
              />
            </Field>
            {budget && !errors.leaveTypeId ? (
              <p
                aria-live="polite"
                className={budget.over ? "text-xs text-rose-600" : "text-xs text-neutral-500"}
              >
                {budget.text}
              </p>
            ) : null}
          </div>

          <Field label="First Day" htmlFor="startDate" required error={errors.startDate}>
            <DatePicker
              id="startDate"
              name="startDate"
              value={startDate}
              onValueChange={(value) => {
                setStartDate(value)
                // A spell cannot end before it starts; follow the first day up.
                if (value > endDate) setEndDate(value)
              }}
              today={today}
              invalid={Boolean(errors.startDate)}
            />
          </Field>

          <Field
            label="Last Day"
            htmlFor="endDate"
            required
            error={errors.endDate}
            hint={
              days > 0
                ? `${days} calendar ${days === 1 ? "day" : "days"}, both ends included.`
                : undefined
            }
          >
            <DatePicker
              id="endDate"
              name="endDate"
              value={endDate}
              onValueChange={setEndDate}
              today={today}
              invalid={Boolean(errors.endDate)}
            />
          </Field>

          <Field label="Status" htmlFor="status" required error={errors.status}>
            <Select
              id="status"
              name="status"
              value={status}
              onValueChange={setStatus}
              options={LEAVE_STATUSES}
              invalid={Boolean(errors.status)}
            />
          </Field>

          <Field label="Reason" htmlFor="reason" error={errors.reason} className="md:col-span-2">
            <TextArea
              id="reason"
              name="reason"
              rows={2}
              maxLength={300}
              placeholder="Optional"
              aria-invalid={Boolean(errors.reason)}
            />
          </Field>
        </FormGrid>
      </FormSection>
    </form>
  )
}

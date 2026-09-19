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
import { LEAVE_STATUSES, LEAVE_TYPES, leaveDays } from "../constants"

const initialState: FormState = {}

/** One spell of leave, for anyone on the roll. */
export function LeaveForm({ roster, today }: { roster: RosterEntry[]; today: string }) {
  const [state, formAction, pending] = useActionState(recordLeave, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  const [employeeId, setEmployeeId] = useState("")
  const [leaveType, setLeaveType] = useState("annual")
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [status, setStatus] = useState("pending")

  const days = leaveDays(startDate, endDate)

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

          <Field label="Type" htmlFor="leaveType" required error={errors.leaveType}>
            <Select
              id="leaveType"
              name="leaveType"
              value={leaveType}
              onValueChange={setLeaveType}
              options={LEAVE_TYPES}
              invalid={Boolean(errors.leaveType)}
            />
          </Field>

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

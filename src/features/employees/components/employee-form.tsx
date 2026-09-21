"use client"

import { usePathname, useRouter } from "next/navigation"
import { useActionState, useState } from "react"
import { Plus } from "lucide-react"

import { DatePicker } from "@/components/form/date-picker"
import { Field, MoneyInput, TextInput } from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { Select } from "@/components/form/select"
import { cn } from "@/lib/cn"
import type { FormState } from "@/lib/form-state"
import { useActionToast } from "@/components/ui/toast"

import type { Shift } from "@/features/shifts/actions"
import { shiftHours } from "@/features/shifts/constants"

import { createEmployee, updateEmployee } from "../actions"
import {
  EMPLOYEE_FIELDS,
  EMPLOYEE_TABS,
  isFieldShown,
  type EmployeeField,
  type EmployeeRecord,
} from "../fields"
import { EmployeeProfile } from "./employee-profile"

const initialState: FormState = {}

/** A field's opening value when nothing is on file yet. */
function defaultFor(field: EmployeeField, today: string) {
  if (field.name === "status") return "active"
  if (field.name === "employmentType") return "pkwtt"
  if (field.name === "joinDate") return today
  return ""
}

/**
 * The employee record, split into tabs. Every tab stays mounted and is only
 * hidden, so one Save sends every field whichever tab is open.
 */
export function EmployeeForm({
  today,
  employee,
  departments,
  preset = {},
  shifts = [],
}: {
  today: string
  /** Given when opening an existing employee; the form starts on their details. */
  employee?: EmployeeRecord
  /** Department names from Setup. */
  departments: string[]
  /** Values to open on instead — a department just created and returned from. */
  preset?: Record<string, string>
  /** The shifts set up under Shift & Attendance, for the dropdown. */
  shifts?: Shift[]
}) {
  const [state, formAction, pending] = useActionState(
    employee ? updateEmployee : createEmployee,
    initialState,
  )
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  const [activeTab, setActiveTab] = useState(EMPLOYEE_TABS[0].key)

  const initialFor = (field: EmployeeField) =>
    preset[field.name] ??
    (employee ? (employee.values[field.name] ?? "") : defaultFor(field, today))

  // The values other fields depend on — Employment Status deciding whether a
  // contract end date is asked for — kept here so the form can react to them.
  const [watched, setWatched] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      EMPLOYEE_FIELDS.flatMap((field) => field.showWhen ?? []).map(({ field: name }) => {
        const field = EMPLOYEE_FIELDS.find((candidate) => candidate.name === name)
        return [name, field ? initialFor(field) : ""]
      }),
    ),
  )

  const tabHasError = (key: string) =>
    EMPLOYEE_TABS.find((tab) => tab.key === key)?.sections.some((section) =>
      section.fields.some((field) => errors[field.name]),
    ) ?? false

  // A failed save may be about a field on another tab. Jump to the first one
  // with a problem, adjusted during render so the wrong tab never paints.
  const [seenState, setSeenState] = useState(state)
  if (state !== seenState) {
    setSeenState(state)
    const firstWithError = EMPLOYEE_TABS.find((tab) => tabHasError(tab.key))
    if (firstWithError && !tabHasError(activeTab)) setActiveTab(firstWithError.key)
  }

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      {employee ? <input type="hidden" name="id" value={employee.id} /> : null}

      <FormHeader
        crumbs={[{ label: "Employees", href: "/hris/employees" }]}
        title={employee ? employee.fullName : "New Employee"}
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />

      <div className="flex flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1">
          <div
            role="tablist"
            aria-label="Employee details"
            className="sticky top-14 z-10 flex shrink-0 gap-6 overflow-x-auto border-b border-black/8 bg-white px-4 [scrollbar-width:none] sm:px-6"
          >
            {EMPLOYEE_TABS.map((tab) => {
              const selected = tab.key === activeTab
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  id={`tab-${tab.key}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.key}`}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "relative shrink-0 cursor-pointer border-b-2 py-3 text-sm whitespace-nowrap transition-colors",
                    selected
                      ? "border-neutral-900 text-neutral-900"
                      : "border-transparent text-neutral-500 hover:text-neutral-900",
                  )}
                >
                  {tab.label}
                  {tabHasError(tab.key) ? (
                    <>
                      <span aria-hidden className="absolute top-2.5 -right-2 size-1.5 rounded-full bg-rose-500" />
                      <span className="sr-only"> (has errors)</span>
                    </>
                  ) : null}
                </button>
              )
            })}
          </div>

          {EMPLOYEE_TABS.map((tab) => (
            <div
              key={tab.key}
              role="tabpanel"
              id={`panel-${tab.key}`}
              aria-labelledby={`tab-${tab.key}`}
              hidden={tab.key !== activeTab}
            >
              {tab.sections.map((section, index) => (
                <FormSection
                  key={section.title}
                  title={section.title}
                  className={cn(index === tab.sections.length - 1 && "border-b-0")}
                >
                  <FormGrid>
                    {section.fields.filter((field) => isFieldShown(field, watched)).map((field) => (
                      <Field
                        key={field.name}
                        label={field.label}
                        htmlFor={field.name}
                        required={field.required}
                        error={errors[field.name]}
                        hint={field.hint}
                      >
                        <FieldControl
                          field={field}
                          initial={initialFor(field)}
                          onChange={
                            field.name in watched
                              ? (value) => setWatched((prev) => ({ ...prev, [field.name]: value }))
                              : undefined
                          }
                          invalid={Boolean(errors[field.name])}
                          today={today}
                          departments={departments}
                          shifts={shifts}
                        />
                      </Field>
                    ))}
                  </FormGrid>
                </FormSection>
              ))}
            </div>
          ))}
        </div>

        {employee ? (
          // Beside the record on a wide screen; above the tabs on a phone.
          <aside className="order-first border-black/8 lg:order-none lg:w-72 lg:shrink-0 lg:border-l">
            <div className="lg:sticky lg:top-14">
              <EmployeeProfile
                id={employee.id}
                fullName={employee.fullName}
                employeeNo={employee.employeeNo}
                photoUrl={employee.photoUrl}
              />
            </div>
          </aside>
        ) : null}
      </div>
    </form>
  )
}

/** One input, chosen by the field's type. Holds its own value where the control needs one. */
function FieldControl({
  field,
  initial,
  invalid,
  today,
  departments,
  shifts,
  onChange,
}: {
  field: EmployeeField
  initial: string
  /** Told of every new value, for a field other fields depend on. */
  onChange?: (value: string) => void
  invalid: boolean
  today: string
  departments: string[]
  shifts: Shift[]
}) {
  const [value, setOwnValue] = useState(initial)
  const setValue = (next: string) => {
    setOwnValue(next)
    onChange?.(next)
  }
  const router = useRouter()
  const pathname = usePathname()

  switch (field.type) {
    case "choice":
      return (
        <Select
          id={field.name}
          name={field.name}
          value={value}
          onValueChange={setValue}
          options={[
            // Required choices always hold a value; the rest can be cleared.
            ...(field.required ? [] : [{ value: "", label: "—" }]),
            ...(field.options ?? []),
          ]}
          invalid={invalid}
        />
      )
    case "department":
      return (
        <Select
          id={field.name}
          name={field.name}
          value={value}
          onValueChange={setValue}
          options={[
            { value: "", label: "—" },
            ...departments.map((name) => ({ value: name, label: name })),
            // A department since removed from Setup still shows on who has it.
            ...(value && !departments.includes(value) ? [{ value, label: value }] : []),
          ]}
          invalid={invalid}
          placeholder={departments.length === 0 ? "No departments yet — add one" : undefined}
          footer={(close) => (
            <button
              type="button"
              onClick={() => {
                close()
                // Come back here once the department is saved.
                router.push(`/hris/departments/new?next=${encodeURIComponent(pathname)}`)
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="size-4 text-neutral-500" strokeWidth={2} />
              Add department
            </button>
          )}
        />
      )
    case "shift":
      return (
        <Select
          id={field.name}
          name={field.name}
          value={value}
          onValueChange={setValue}
          options={[
            { value: "", label: "—" },
            ...shifts.map((shift) => ({
              value: shift.id,
              label: `${shift.name} · ${shift.startsAt}–${shift.endsAt} · ${shiftHours(shift.startsAt, shift.endsAt)}`,
            })),
          ]}
          invalid={invalid}
          placeholder={shifts.length === 0 ? "No shifts yet — add one" : undefined}
          footer={(close) => (
            <button
              type="button"
              onClick={() => {
                close()
                // Shifts are set up in their own area; come back here once saved.
                router.push(
                  `/hris/attendance/shifts/new?next=${encodeURIComponent(pathname)}`,
                )
              }}
              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              <Plus className="size-4 text-neutral-500" strokeWidth={2} />
              Add shift
            </button>
          )}
        />
      )
    case "date":
      return (
        <DatePicker
          id={field.name}
          name={field.name}
          value={value}
          onValueChange={setValue}
          today={today}
          invalid={invalid}
        />
      )
    case "money":
      return (
        <MoneyInput
          id={field.name}
          name={field.name}
          value={value}
          onValueChange={setValue}
          invalid={invalid}
        />
      )
    case "text":
      return (
        <TextInput
          id={field.name}
          name={field.name}
          autoComplete="off"
          defaultValue={initial}
          placeholder={field.placeholder}
          aria-invalid={invalid}
        />
      )
  }
}

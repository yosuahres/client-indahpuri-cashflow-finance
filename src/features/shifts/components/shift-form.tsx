"use client"

import { useActionState, useState } from "react"

import { Field, TextInput } from "@/components/form/fields"
import {
  FormGrid,
  FormHeader,
  FormSection,
  NotSavedBadge,
  SaveButton,
} from "@/components/form/form-shell"
import { useActionToast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import type { FormState } from "@/lib/form-state"

import { createShift } from "../actions"
import { crossesMidnight, shiftColor, shiftHours } from "../constants"
import { ColorPicker } from "./color-picker"

const initialState: FormState = {}

export function ShiftForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(createShift, initialState)
  const errors = state.fieldErrors ?? {}
  useActionToast(state)

  const [name, setName] = useState("")
  const [startsAt, setStartsAt] = useState("08:00")
  const [endsAt, setEndsAt] = useState("17:00")
  const [color, setColor] = useState("blue")

  const overnight = crossesMidnight(startsAt, endsAt)
  const swatch = shiftColor(color)

  return (
    <form action={formAction} noValidate className="flex min-h-full flex-col">
      <input type="hidden" name="next" value={next} />

      <FormHeader
        crumbs={[{ label: "Shifts", href: "/hris/attendance/shifts" }]}
        title="New Shift"
        status={<NotSavedBadge />}
        action={<SaveButton pending={pending} />}
      />

      <FormSection className="border-b-0">
        <FormGrid>
          <Field
            label="Shift Name"
            htmlFor="name"
            required
            error={errors.name}
            className="md:col-span-2"
          >
            <TextInput
              id="name"
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              maxLength={60}
              placeholder="e.g. Morning, Afternoon, Night"
              aria-invalid={Boolean(errors.name)}
            />
          </Field>

          <Field label="Start Time" htmlFor="startsAt" required error={errors.startsAt}>
            <TextInput
              id="startsAt"
              name="startsAt"
              type="time"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              aria-invalid={Boolean(errors.startsAt)}
            />
          </Field>

          <Field
            label="End Time"
            htmlFor="endsAt"
            required
            error={errors.endsAt}
            hint={
              overnight
                ? "Runs past midnight and ends the next day."
                : undefined
            }
          >
            <TextInput
              id="endsAt"
              name="endsAt"
              type="time"
              value={endsAt}
              onChange={(event) => setEndsAt(event.target.value)}
              aria-invalid={Boolean(errors.endsAt)}
            />
          </Field>

          <Field
            label="Roster Colour"
            htmlFor="color"
            required
            error={errors.color}
            hint="Marks this shift wherever a roster shows it."
            className="md:col-span-2"
          >
            <ColorPicker name="color" value={color} onValueChange={setColor} />
          </Field>
        </FormGrid>

        {/* What the shift will look like where it is used, so the colour is
            chosen against the thing it marks rather than in the abstract. */}
        <div className="mt-8 rounded-lg bg-neutral-50 p-4">
          <p className="mb-2.5 text-xs font-medium text-neutral-500">Preview</p>
          <span
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm font-medium",
              swatch.chip,
            )}
          >
            <span className={cn("size-2.5 shrink-0 rounded-full", swatch.swatch)} />
            {name.trim() || "Shift name"}
            <span className="font-normal opacity-70">
              {startsAt} – {endsAt} · {shiftHours(startsAt, endsAt)}
            </span>
          </span>
        </div>
      </FormSection>
    </form>
  )
}

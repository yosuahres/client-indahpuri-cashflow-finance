"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { deleteShift, type Shift } from "../actions"
import { crossesMidnight, shiftColor, shiftHours } from "../constants"

const headCell = "px-3 py-2.5 text-left font-medium text-neutral-700"
const cell = "px-3 py-2.5"

/**
 * Every shift, with how many people are on it. Deleting takes two clicks, as
 * on the Departments table — and anyone on the shift keeps their record, they
 * simply stop having hours.
 */
export function ShiftTable({
  shifts,
  headcount,
}: {
  shifts: Shift[]
  /** Employees per shift id. */
  headcount: Record<string, number>
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function remove(id: string) {
    setConfirmingId(null)
    startTransition(async () => {
      const result = await deleteShift(id)
      if (result.ok) toast.success("Shift removed.")
      else toast.error(result.error ?? "Could not remove that shift.")
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Shifts, each removable.</caption>
        <thead>
          <tr className="bg-neutral-50">
            <th scope="col" className={cn("min-w-[220px]", headCell)}>Shift</th>
            <th scope="col" className={cn("min-w-[180px]", headCell)}>Hours</th>
            <th scope="col" className={cn("min-w-[90px]", headCell)}>Length</th>
            <th scope="col" className={cn("min-w-[110px]", headCell)}>Employees</th>
            <th scope="col" className="w-28 px-2 py-2.5">
              <span className="sr-only">Row actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {shifts.map((shift) => {
            const color = shiftColor(shift.color)
            const overnight = crossesMidnight(shift.startsAt, shift.endsAt)

            return (
              <tr key={shift.id} className="border-t border-black/5 hover:bg-neutral-50/70">
                <td className={cell}>
                  <span
                    className={cn(
                      "inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium",
                      color.chip,
                    )}
                  >
                    <span className={cn("size-2.5 shrink-0 rounded-full", color.swatch)} />
                    {shift.name}
                  </span>
                </td>
                <td className={cn(cell, "whitespace-nowrap text-neutral-700 tabular-nums")}>
                  {shift.startsAt} – {shift.endsAt}
                  {overnight ? (
                    <span className="ml-2 text-xs text-neutral-500">next day</span>
                  ) : null}
                </td>
                <td className={cn(cell, "text-neutral-700 tabular-nums")}>
                  {shiftHours(shift.startsAt, shift.endsAt)}
                </td>
                <td className={cn(cell, "text-neutral-700 tabular-nums")}>
                  {headcount[shift.id] ?? 0}
                </td>
                <td className="w-28 px-2 py-1.5 text-right">
                  {confirmingId === shift.id ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(shift.id)}
                        disabled={pending}
                        className="cursor-pointer rounded bg-rose-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(shift.id)}
                      disabled={pending}
                      aria-label={`Remove ${shift.name}`}
                      className="ml-auto grid size-8 cursor-pointer place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 focus-visible:text-rose-600 focus-visible:outline-2 focus-visible:outline-neutral-800 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  )}
                </td>
              </tr>
            )
          })}

          {shifts.length === 0 ? (
            <tr className="border-t border-black/5">
              <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                No shifts yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

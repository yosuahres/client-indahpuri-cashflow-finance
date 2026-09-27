"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { formatDate } from "@/lib/format"

import { deleteLeaveType, type LeaveType } from "../type-actions"

const headCell = "px-3 py-2.5 text-left font-medium text-neutral-700"
const cell = "px-3 py-2.5"

/**
 * Every leave type, with how much leave is on file under each. Deleting takes
 * two clicks, as on the Shifts table, and a type anything is recorded against
 * is refused.
 */
export function LeaveTypeTable({
  types,
  usage,
}: {
  types: LeaveType[]
  /** Spells of leave per type id. */
  usage: Record<string, number>
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function remove(id: string) {
    setConfirmingId(null)
    startTransition(async () => {
      const result = await deleteLeaveType(id)
      if (result.ok) toast.success("Leave type removed.")
      else toast.error(result.error ?? "Could not remove that leave type.")
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Leave types, each removable while nothing uses it.</caption>
        <thead>
          <tr className="bg-neutral-50">
            <th scope="col" className={`min-w-[200px] ${headCell}`}>Leave Type</th>
            <th scope="col" className={`min-w-[110px] ${headCell}`}>Leave on File</th>
            <th scope="col" className={`min-w-[120px] ${headCell}`}>Added</th>
            <th scope="col" className="w-28 px-2 py-2.5">
              <span className="sr-only">Row actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {types.map((type) => (
            <tr key={type.id} className="border-t border-black/5 hover:bg-neutral-50/70">
              <td className={`${cell} text-neutral-900`}>{type.name}</td>
              <td className={`${cell} text-neutral-700 tabular-nums`}>{usage[type.id] ?? 0}</td>
              <td className={`${cell} whitespace-nowrap text-neutral-700`}>
                {formatDate(type.createdAt.slice(0, 10))}
              </td>
              <td className="w-28 px-2 py-1.5 text-right">
                {confirmingId === type.id ? (
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
                      onClick={() => remove(type.id)}
                      disabled={pending}
                      className="cursor-pointer rounded bg-rose-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(type.id)}
                    disabled={pending}
                    aria-label={`Remove ${type.name}`}
                    className="ml-auto grid size-8 cursor-pointer place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 focus-visible:text-rose-600 focus-visible:outline-2 focus-visible:outline-neutral-800 disabled:pointer-events-none disabled:opacity-40"
                  >
                    <Trash2 className="size-4" strokeWidth={1.75} />
                  </button>
                )}
              </td>
            </tr>
          ))}

          {types.length === 0 ? (
            <tr className="border-t border-black/5">
              <td colSpan={4} className="px-3 py-8 text-center text-neutral-500">
                No leave types yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

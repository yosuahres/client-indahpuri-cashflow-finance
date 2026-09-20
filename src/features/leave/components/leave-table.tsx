"use client"

import Link from "next/link"
import { Fragment, useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"

import { deleteLeave, setLeaveStatus, type LeaveEntry } from "../actions"
import { DEFAULT_LEAVE_COLUMNS, LEAVE_COLUMNS, type LeaveColumnKey } from "../columns"
import {
  leaveDays,
  leaveStatusLabel,
  leaveTypeLabel,
  type LeaveStatusValue,
} from "../constants"

const WIDTHS = Object.fromEntries(
  LEAVE_COLUMNS.map((column) => [column.key, column.width]),
) as Record<LeaveColumnKey, string>

const LABELS = Object.fromEntries(
  LEAVE_COLUMNS.map((column) => [column.key, column.label]),
) as Record<LeaveColumnKey, string>

const headCell = "px-3 py-2.5 text-left font-medium text-neutral-700"
const cell = "px-3 py-2.5"

/** Colour carries the same thing the word does, so it is never the only cue. */
const TONES: Record<LeaveStatusValue, string> = {
  pending: "bg-amber-50 text-amber-800",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-neutral-100 text-neutral-500",
}

/** Narrows the list by status. The choice sits in the URL, so the view is shareable. */
/** How each optional column renders for one spell of leave. */
function leaveCell(key: LeaveColumnKey, entry: LeaveEntry) {
  switch (key) {
    case "leaveType":
      return (
        <td className={cn(cell, "whitespace-nowrap text-neutral-700")}>
          {leaveTypeLabel(entry.leaveType)}
        </td>
      )
    case "days":
      return (
        <td className={cn(cell, "whitespace-nowrap text-neutral-700")}>
          {entry.startDate === entry.endDate
            ? formatDate(entry.startDate)
            : `${formatDate(entry.startDate)} – ${formatDate(entry.endDate)}`}
        </td>
      )
    case "startDate":
      return (
        <td className={cn(cell, "whitespace-nowrap text-neutral-700")}>
          {formatDate(entry.startDate)}
        </td>
      )
    case "endDate":
      return (
        <td className={cn(cell, "whitespace-nowrap text-neutral-700")}>
          {formatDate(entry.endDate)}
        </td>
      )
    case "length":
      return (
        <td className={cn(cell, "text-neutral-700 tabular-nums")}>
          {leaveDays(entry.startDate, entry.endDate)}
        </td>
      )
    case "status":
      return (
        <td className={cell}>
          <span
            className={cn(
              "inline-block rounded px-1.5 py-0.5 text-xs font-medium",
              TONES[entry.status],
            )}
          >
            {leaveStatusLabel(entry.status)}
          </span>
        </td>
      )
    case "reason":
      return <td className={cn(cell, "text-neutral-600")}>{entry.reason ?? "—"}</td>
    case "createdAt":
      return (
        <td className={cn(cell, "whitespace-nowrap text-neutral-700")}>
          {formatDate(entry.createdAt.slice(0, 10))}
        </td>
      )
  }
}

export function LeaveTable({
  entries,
  columns = DEFAULT_LEAVE_COLUMNS,
}: {
  entries: LeaveEntry[]
  /** Which optional columns to show, in the order they appear. */
  columns?: LeaveColumnKey[]
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [busy, startBusy] = useTransition()

  function decide(id: string, next: LeaveStatusValue) {
    startBusy(async () => {
      const result = await setLeaveStatus(id, next)
      if (result.ok) toast.success(`Leave ${next}.`)
      else toast.error(result.error ?? "Could not change that leave.")
    })
  }

  function remove(id: string) {
    setConfirmingId(null)
    startBusy(async () => {
      const result = await deleteLeave(id)
      if (result.ok) toast.success("Leave removed.")
      else toast.error(result.error ?? "Could not remove that leave.")
    })
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Leave across everyone, most recent first.</caption>
        <thead>
          <tr className="bg-neutral-50">
            <th scope="col" className={cn("min-w-[200px]", headCell)}>Employee</th>
            {columns.map((key) => (
              <th key={key} scope="col" className={cn(WIDTHS[key], headCell)}>
                {LABELS[key]}
              </th>
            ))}
            <th scope="col" className="w-48 px-2 py-2.5">
              <span className="sr-only">Row actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-t border-black/5 hover:bg-neutral-50/70">
              <td className={cell}>
                <Link
                  href={`/hris/employees/${entry.employeeId}`}
                  className="text-neutral-900 hover:underline"
                >
                  {entry.employeeName}
                </Link>
                {entry.employeeNo ? (
                  <span className="block text-xs text-neutral-500">{entry.employeeNo}</span>
                ) : null}
              </td>
              {columns.map((key) => (
                <Fragment key={key}>{leaveCell(key, entry)}</Fragment>
              ))}
              <td className="w-48 px-2 py-1.5">
                <div className="flex items-center justify-end gap-1">
                  {confirmingId === entry.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setConfirmingId(null)}
                        className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(entry.id)}
                        disabled={busy}
                        className="cursor-pointer rounded bg-rose-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      {entry.status !== "approved" ? (
                        <button
                          type="button"
                          onClick={() => decide(entry.id, "approved")}
                          disabled={busy}
                          className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                        >
                          Approve
                        </button>
                      ) : null}
                      {entry.status !== "rejected" ? (
                        <button
                          type="button"
                          onClick={() => decide(entry.id, "rejected")}
                          disabled={busy}
                          className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setConfirmingId(entry.id)}
                        disabled={busy}
                        aria-label={`Remove ${entry.employeeName}'s leave from ${formatDate(entry.startDate)}`}
                        className="grid size-8 cursor-pointer place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 focus-visible:text-rose-600 focus-visible:outline-2 focus-visible:outline-neutral-800 disabled:pointer-events-none disabled:opacity-40"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}

          {entries.length === 0 ? (
            <tr className="border-t border-black/5">
              <td colSpan={columns.length + 2} className="px-3 py-8 text-center text-neutral-500">
                No leave on the record yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

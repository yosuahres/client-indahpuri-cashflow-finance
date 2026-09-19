"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { Trash2, X } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"

import { deleteEmployees, type Employee } from "../actions"
import { employeeStatusLabel, employmentTypeLabel } from "../constants"

// The tick and the name stay put while the rest of the row scrolls sideways on a phone.
const stickyGutter = "sticky left-0 z-10 w-9 min-w-9 sm:w-12 sm:min-w-12"
const stickyName = "sticky left-9 z-10 min-w-[180px] sm:left-12 sm:min-w-[220px]"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-3 py-2.5"

const checkbox =
  "size-4 shrink-0 cursor-pointer accent-neutral-900 disabled:cursor-not-allowed"

const pillButton =
  "rounded-full px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15 disabled:pointer-events-none disabled:opacity-50"

function Empty() {
  return <span className="text-neutral-400">—</span>
}

/**
 * Every employee on file, laid out like the Profit and Loss ledger. Clicking a
 * row opens that employee's details, ready to edit; ticking rows offers to
 * delete them.
 */
export function EmployeeTable({ employees }: { employees: Employee[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  // A delete or a filter change can retire an id while it is still ticked, so
  // the live selection is derived from what the table actually holds.
  const picked = useMemo(
    () => employees.filter((employee) => selected.has(employee.id)).map((employee) => employee.id),
    [employees, selected],
  )
  const allPicked = picked.length > 0 && picked.length === employees.length

  function toggle(id: string) {
    setConfirming(false)
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
    setConfirming(false)
  }

  function remove() {
    const ids = picked
    startTransition(async () => {
      const result = await deleteEmployees(ids)
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete those employees.")
        return
      }
      toast.success(`${result.deleted} employee${result.deleted === 1 ? "" : "s"} deleted.`)
      clear()
    })
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Employees on file.</caption>
          <thead>
            <tr className="bg-neutral-50">
              <th scope="col" className={cn(stickyGutter, "bg-neutral-50 p-0")}>
                <span className="sr-only">Select</span>
              </th>
              <th scope="col" className={cn(stickyName, "bg-neutral-50", headCell)}>
                Name
              </th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>
                Employee ID
              </th>
              <th scope="col" className={cn("min-w-[160px]", headCell)}>
                Position
              </th>
              <th scope="col" className={cn("min-w-[160px]", headCell)}>
                Department
              </th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>
                Employment
              </th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>
                Join Date
              </th>
              <th scope="col" className={cn("min-w-[100px]", headCell)}>
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {employees.map((employee) => {
              const isPicked = selected.has(employee.id)
              return (
                <tr
                  key={employee.id}
                  onClick={() => router.push(`/hris/employees/${employee.id}`)}
                  className={cn(
                    "group cursor-pointer border-t border-black/5",
                    isPicked ? "bg-neutral-100" : "hover:bg-neutral-50/70",
                  )}
                >
                  {/* Ticking a row is not opening it, so the box keeps the click. */}
                  <td
                    onClick={(event) => event.stopPropagation()}
                    className={cn(
                      stickyGutter,
                      "px-2 py-2.5 text-center sm:px-3",
                      isPicked ? "bg-neutral-100" : "bg-white group-hover:bg-neutral-50",
                    )}
                  >
                    <input
                      type="checkbox"
                      className={checkbox}
                      checked={isPicked}
                      disabled={pending}
                      onChange={() => toggle(employee.id)}
                      aria-label={`Select ${employee.fullName}`}
                    />
                  </td>
                  <td
                    className={cn(
                      stickyName,
                      cell,
                      "text-neutral-900",
                      isPicked ? "bg-neutral-100" : "bg-white group-hover:bg-neutral-50",
                    )}
                  >
                    {/* A row is not focusable, so the real link lives here. */}
                    <Link
                      href={`/hris/employees/${employee.id}`}
                      onClick={(event) => event.stopPropagation()}
                      className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-neutral-800"
                    >
                      {employee.fullName}
                    </Link>
                  </td>
                  <td className={cn(cell, "whitespace-nowrap text-neutral-700 tabular-nums")}>
                    {employee.employeeNo}
                  </td>
                  <td className={cn(cell, "text-neutral-700")}>{employee.position ?? <Empty />}</td>
                  <td className={cn(cell, "text-neutral-700")}>{employee.department ?? <Empty />}</td>
                  <td className={cn(cell, "text-neutral-700")}>
                    {employmentTypeLabel(employee.employmentType)}
                  </td>
                  <td className={cn(cell, "whitespace-nowrap text-neutral-700")}>
                    {employee.joinDate ? formatDate(employee.joinDate) : <Empty />}
                  </td>
                  <td className={cell}>
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap",
                        employee.status === "active"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-neutral-100 text-neutral-600",
                      )}
                    >
                      {employeeStatusLabel(employee.status)}
                    </span>
                  </td>
                </tr>
              )
            })}

            {employees.length === 0 ? (
              <tr className="border-t border-black/5">
                <td colSpan={8} className="px-3 py-8 text-center text-neutral-500">
                  No employees found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* Floats over the list rather than pushing it, so the rows a count
          refers to stay where they were when you ticked them. */}
      {picked.length > 0 ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 sm:bottom-6"
        >
          <div className="flex max-w-full items-center gap-1 rounded-full bg-neutral-900 py-1.5 pr-1.5 pl-4 text-white shadow-lg shadow-black/25">
            {confirming ? (
              <>
                {/* Nothing recovers a deleted employee, so the count is spelled
                    out once more before it goes. */}
                <span className="text-sm">
                  Delete {picked.length} employee{picked.length === 1 ? "" : "s"}?
                </span>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className={pillButton}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className={cn(pillButton, "bg-rose-600 hover:bg-rose-500")}
                >
                  {pending ? "Deleting…" : "Delete"}
                </button>
              </>
            ) : (
              <>
                <span className="text-sm tabular-nums">{picked.length} selected</span>
                <span aria-hidden className="mx-1 h-4 w-px bg-white/25" />
                <button
                  type="button"
                  onClick={() => setSelected(new Set(employees.map((employee) => employee.id)))}
                  disabled={pending || allPicked}
                  className={pillButton}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={pending}
                  className={cn(pillButton, "flex items-center gap-1.5")}
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                  Delete
                </button>
              </>
            )}

            <button
              type="button"
              onClick={clear}
              disabled={pending}
              aria-label="Clear selection"
              className="ml-0.5 grid size-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

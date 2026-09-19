"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { deleteDepartment, type Department } from "../actions"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-3 py-2.5"

/**
 * Every department, with how many employees are filed under it. Deleting
 * takes two clicks, as on the Accounts table.
 */
export function DepartmentTable({
  departments,
  headcount,
}: {
  departments: Department[]
  /** Employees per department name. */
  headcount: Record<string, number>
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function remove(id: string) {
    setConfirmingId(null)
    startTransition(async () => {
      const result = await deleteDepartment(id)
      if (result.ok) toast.success("Department removed.")
      else toast.error(result.error ?? "Could not remove that department.")
    })
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Departments, each removable.</caption>
          <thead>
            <tr className="bg-neutral-50">
              <th scope="col" className={cn("min-w-[200px]", headCell)}>
                Department
              </th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>
                Employees
              </th>
              <th scope="col" className="w-28 px-2 py-2.5">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {departments.map((department) => (
              <tr key={department.id} className="border-t border-black/5 hover:bg-neutral-50/70">
                <td className={cn(cell, "text-neutral-900")}>{department.name}</td>
                <td className={cn(cell, "text-neutral-700 tabular-nums")}>
                  {headcount[department.name] ?? 0}
                </td>
                <td className="w-28 px-2 py-1.5 text-right">
                  {confirmingId === department.id ? (
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
                        onClick={() => remove(department.id)}
                        disabled={pending}
                        className="cursor-pointer rounded bg-rose-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmingId(department.id)}
                      disabled={pending}
                      aria-label={`Remove ${department.name}`}
                      className="grid size-8 cursor-pointer place-items-center rounded-md text-neutral-400 hover:bg-neutral-100 hover:text-rose-600 focus-visible:text-rose-600 focus-visible:outline-2 focus-visible:outline-neutral-800 disabled:pointer-events-none disabled:opacity-40 ml-auto"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {departments.length === 0 ? (
              <tr className="border-t border-black/5">
                <td colSpan={3} className="px-3 py-8 text-center text-neutral-500">
                  No departments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}

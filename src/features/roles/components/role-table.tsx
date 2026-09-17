"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { KeyRound, Pencil, Trash2 } from "lucide-react"

import type { RoleSummary } from "@/features/auth/roles"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { deleteRole } from "../actions"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-2 py-2.5 sm:px-3"

const iconButton = cn(
  "grid size-8 place-items-center rounded-md text-neutral-400",
  "hover:bg-neutral-100 hover:text-neutral-900",
  "focus-visible:outline-2 focus-visible:outline-neutral-800",
  "disabled:pointer-events-none disabled:opacity-40",
)

type RoleRow = RoleSummary & { members: number; permissions: number }

/**
 * Every role, with who holds it and how much it may do. Deleting takes two
 * clicks, and is only offered for a role nobody holds.
 */
export function RoleTable({
  roles,
  totalPermissions,
  editable,
}: {
  roles: RoleRow[]
  totalPermissions: number
  /** Off before the roles table exists — the list shown is the fixed one. */
  editable: boolean
}) {
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())
  const [pending, startTransition] = useTransition()

  // Rows arrive fresh after `refresh()`, so a new array folds the removals in.
  const [seenRows, setSeenRows] = useState(roles)
  if (roles !== seenRows) {
    setSeenRows(roles)
    if (removed.size > 0) setRemoved(new Set())
  }

  function remove(role: RoleRow) {
    setConfirmingKey(null)
    setRemoved((current) => new Set(current).add(role.key))
    startTransition(async () => {
      const result = await deleteRole(role.key)
      if (result.ok) {
        toast.success(`${role.name} deleted.`)
        return
      }
      toast.error(result.error ?? "Could not delete that role.")
      setRemoved((current) => {
        const next = new Set(current)
        next.delete(role.key)
        return next
      })
    })
  }

  const live = roles.filter((role) => !removed.has(role.key))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">Every role, who holds it, and how much it may do.</caption>
        <thead>
          <tr className="bg-neutral-50">
            <th scope="col" className={cn("min-w-[240px]", headCell)}>
              Role
            </th>
            <th scope="col" className={cn("min-w-[90px]", headCell)}>
              Users
            </th>
            <th scope="col" className={cn("min-w-[130px]", headCell)}>
              Permissions
            </th>
            <th scope="col" className="w-40 px-2 py-2.5">
              <span className="sr-only">Row actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {live.map((role) => {
            const confirming = confirmingKey === role.key
            const blocked = role.builtIn
              ? "Built-in roles cannot be deleted"
              : role.members > 0
                ? "Give its users another role first"
                : null

            return (
              <tr key={role.key} className="border-t border-black/5">
                <td className={cell}>
                  <span className="font-medium text-neutral-900">{role.name}</span>
                  {role.builtIn ? (
                    <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">
                      Built in
                    </span>
                  ) : null}
                  {role.description ? (
                    <span className="mt-0.5 block text-xs text-neutral-500">{role.description}</span>
                  ) : null}
                </td>

                <td className={cn(cell, "tabular-nums text-neutral-700")}>{role.members}</td>

                <td className={cn(cell, "tabular-nums text-neutral-700")}>
                  {role.permissions} of {totalPermissions}
                </td>

                <td className="w-40 px-2 py-1.5">
                  {confirming ? (
                    <span className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirmingKey(null)}
                        className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(role)}
                        disabled={pending}
                        className="cursor-pointer rounded bg-rose-600 px-1.5 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        Delete role
                      </button>
                    </span>
                  ) : (
                    <span className="flex items-center justify-end gap-0.5">
                      <Link
                        href="/settings/permissions"
                        aria-label={`Permissions for ${role.name}`}
                        title="Permissions"
                        className={iconButton}
                      >
                        <KeyRound className="size-4" strokeWidth={1.75} />
                      </Link>
                      {editable ? (
                        <>
                          <Link
                            href={`/settings/roles/${role.key}`}
                            aria-label={`Edit ${role.name}`}
                            title="Edit"
                            className={iconButton}
                          >
                            <Pencil className="size-4" strokeWidth={1.75} />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmingKey(role.key)}
                            disabled={pending || blocked !== null}
                            aria-label={`Delete ${role.name}`}
                            title={blocked ?? "Delete"}
                            className={cn(iconButton, "cursor-pointer hover:text-rose-600")}
                          >
                            <Trash2 className="size-4" strokeWidth={1.75} />
                          </button>
                        </>
                      ) : null}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}

          {live.length === 0 ? (
            <tr className="border-t border-black/5">
              <td colSpan={4} className="px-3 py-6 text-center text-neutral-500">
                No roles yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

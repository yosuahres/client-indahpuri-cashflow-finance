"use client"

import { useState, useTransition, type ReactNode } from "react"
import {
  FileText,
  Hash,
  KeyRound,
  Lock,
  Pencil,
  ShieldCheck,
  Trash2,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { RowMenu, SortHeader } from "@/components/table/data-table"
import { ACTION_CELL, ACTION_HEAD, BODY_ROW, CELL, HEAD_ROW, TABLE } from "@/components/table/styles"
import type { RoleSummary } from "@/features/auth/roles"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { deleteRole } from "../actions"
import { DEFAULT_ROLE_COLUMNS, ROLE_COLUMNS, type RoleColumnKey } from "../columns"

const ICONS: Record<RoleColumnKey, LucideIcon> = {
  key: Hash,
  description: FileText,
  builtIn: Lock,
  members: UsersRound,
  permissions: KeyRound,
}

type RoleRow = RoleSummary & { members: number; permissions: number }

const WIDTHS = Object.fromEntries(
  ROLE_COLUMNS.map((column) => [column.key, column.width]),
) as Record<RoleColumnKey, string>

const LABELS = Object.fromEntries(
  ROLE_COLUMNS.map((column) => [column.key, column.label]),
) as Record<RoleColumnKey, string>

/** How each optional column reads. */
const CELLS: Record<RoleColumnKey, (role: RoleRow, total: number) => ReactNode> = {
  key: (role) => role.key,
  description: (role) => role.description || <span className="text-neutral-400">—</span>,
  builtIn: (role) => (role.builtIn ? "Yes" : "No"),
  members: (role) => role.members,
  permissions: (role, total) => `${role.permissions} of ${total}`,
}

/**
 * Every role, with who holds it and how much it may do. Deleting takes two
 * clicks, and is only offered for a role nobody holds.
 */
export function RoleTable({
  roles,
  totalPermissions,
  editable,
  columns = DEFAULT_ROLE_COLUMNS,
  sort,
  direction,
}: {
  roles: RoleRow[]
  totalPermissions: number
  /** Off before the roles table exists — the list shown is the fixed one. */
  editable: boolean
  /** Which optional columns to show, in the order they appear. */
  columns?: RoleColumnKey[]
  sort: string
  direction: string
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
      <table className={TABLE}>
        <caption className="sr-only">Every role, who holds it, and how much it may do.</caption>
        <thead>
          <tr className={HEAD_ROW}>
            <SortHeader
              label="Role"
              icon={ShieldCheck}
              sortKey="role"
              sort={sort}
              direction={direction}
              className="min-w-[240px]"
            />
            {columns.map((key) => (
              <SortHeader
                key={key}
                label={LABELS[key]}
                icon={ICONS[key]}
                sortKey={key}
                sort={sort}
                direction={direction}
                className={WIDTHS[key]}
              />
            ))}
            <th scope="col" className={ACTION_HEAD}>
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
              <tr key={role.key} className={BODY_ROW}>
                <td className="px-3 py-2">
                  <span className="font-medium text-neutral-900">{role.name}</span>
                  {role.builtIn ? (
                    <span className="ml-2 rounded-md border border-black/10 bg-neutral-50 px-1.5 text-xs leading-5 font-medium text-neutral-600">
                      Built in
                    </span>
                  ) : null}
                  {role.description && !columns.includes("description") ? (
                    <span className="mt-0.5 block text-xs text-neutral-500">{role.description}</span>
                  ) : null}
                </td>

                {columns.map((key) => (
                  <td key={key} className={cn(CELL, "tabular-nums")}>
                    {CELLS[key](role, totalPermissions)}
                  </td>
                ))}

                <td className={ACTION_CELL}>
                  {confirming ? (
                    <span className="inline-flex items-center gap-1">
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
                    <RowMenu
                      label={`Actions for ${role.name}`}
                      items={[
                        { label: "Permissions", icon: KeyRound, href: `/settings/permissions?role=${role.key}` },
                        ...(editable
                          ? [
                              { label: "Edit", icon: Pencil, href: `/settings/roles/${role.key}` },
                              {
                                label: "Delete role",
                                icon: Trash2,
                                danger: true,
                                disabled: pending || blocked !== null,
                                title: blocked ?? undefined,
                                onSelect: () => setConfirmingKey(role.key),
                              },
                            ]
                          : []),
                      ]}
                    />
                  )}
                </td>
              </tr>
            )
          })}

          {live.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-neutral-500">
                No roles match.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

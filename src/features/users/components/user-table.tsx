"use client"

import { useState, useTransition, type ReactNode } from "react"
import {
  AtSign,
  CalendarPlus,
  CircleUserRound,
  Clock,
  Trash2,
  UserX,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { Avatar, RowMenu, SortHeader, type RowMenuItem } from "@/components/table/data-table"
import { ACTION_CELL, ACTION_HEAD, BODY_ROW, CELL, HEAD_ROW, TABLE } from "@/components/table/styles"
import type { Role, RoleSummary } from "@/features/auth/roles"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { deleteMember, setMemberRole, type TeamMember } from "../actions"
import { DEFAULT_USER_COLUMNS, USER_COLUMNS, type UserColumnKey } from "../columns"

const date = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short", year: "numeric" })

const WIDTHS = Object.fromEntries(
  USER_COLUMNS.map((column) => [column.key, column.width]),
) as Record<UserColumnKey, string>

const LABELS = Object.fromEntries(
  USER_COLUMNS.map((column) => [column.key, column.label]),
) as Record<UserColumnKey, string>

const ICONS: Record<UserColumnKey, LucideIcon> = {
  email: AtSign,
  role: UsersRound,
  lastSignIn: Clock,
  joined: CalendarPlus,
}

/** Badge colours, handed out by a role's place in the list so each keeps its own. */
const ROLE_TONES = [
  "border-amber-200 bg-amber-50 text-amber-700",
  "border-sky-200 bg-sky-50 text-sky-700",
  "border-emerald-200 bg-emerald-50 text-emerald-700",
  "border-violet-200 bg-violet-50 text-violet-700",
  "border-rose-200 bg-rose-50 text-rose-700",
]

const badge = "inline-flex items-center rounded-md border px-1.5 text-xs leading-5 font-medium whitespace-nowrap"

/**
 * Everyone who has signed up, and what each of them may do.
 *
 * A role change applies on pick. Taking access away and deleting both take
 * two clicks: the first shuts someone out mid-task, the second removes their
 * login for good (what they entered stays).
 */
export function UserTable({
  members,
  roles: roleList,
  meId,
  columns = DEFAULT_USER_COLUMNS,
  sort,
  direction,
}: {
  members: TeamMember[]
  roles: RoleSummary[]
  meId: string
  /** Which optional columns to show, in the order they appear. */
  columns?: UserColumnKey[]
  sort: string
  direction: string
}) {
  const [confirming, setConfirming] = useState<{ id: string; action: "revoke" | "delete" } | null>(
    null,
  )
  // Deleted rows leave at once; the server's list confirms it on refresh.
  const [deleted, setDeleted] = useState<ReadonlySet<string>>(new Set())
  const [pending, startTransition] = useTransition()

  // A change paints before the server answers. Rows arrive fresh after
  // `refresh()`, so a new array means the overrides have been folded in.
  const [roles, setRoles] = useState<ReadonlyMap<string, Role | null>>(new Map())
  const [seenRows, setSeenRows] = useState(members)
  if (members !== seenRows) {
    setSeenRows(members)
    if (roles.size > 0) setRoles(new Map())
    if (deleted.size > 0) setDeleted(new Set())
  }

  const roleOf = (member: TeamMember) => (roles.has(member.id) ? (roles.get(member.id) ?? null) : member.role)

  function change(member: TeamMember, role: Role | null) {
    setConfirming(null)
    setRoles((current) => new Map(current).set(member.id, role))
    startTransition(async () => {
      const result = await setMemberRole(member.id, role)
      if (result.ok) toast.success("Role updated.")
      if (!result.ok) {
        toast.error(result.error ?? "Could not change that role.")
        // Put it back; the server never took the change.
        setRoles((current) => {
          const next = new Map(current)
          next.delete(member.id)
          return next
        })
      }
    })
  }

  function remove(member: TeamMember) {
    setConfirming(null)
    setDeleted((current) => new Set(current).add(member.id))
    startTransition(async () => {
      const result = await deleteMember(member.id)
      if (result.ok) toast.success(`${member.name} deleted.`)
      if (!result.ok) {
        toast.error(result.error ?? "Could not delete that user.")
        setDeleted((current) => {
          const next = new Set(current)
          next.delete(member.id)
          return next
        })
      }
    })
  }

  const visible = members.filter((member) => !deleted.has(member.id))

  function roleBadge(role: Role | null) {
    if (!role) {
      return <span className={cn(badge, "border-dashed border-amber-300 text-amber-700")}>Waiting for access</span>
    }
    const index = roleList.findIndex((entry) => entry.key === role)
    const name = roleList[index]?.name ?? role
    return <span className={cn(badge, ROLE_TONES[Math.max(index, 0) % ROLE_TONES.length])}>{name}</span>
  }

  function menu(member: TeamMember, role: Role | null): RowMenuItem[] {
    return [
      { kind: "heading", label: "Role" },
      ...roleList.map((entry) => ({
        label: entry.name,
        checked: entry.key === role,
        disabled: pending,
        onSelect: () => {
          if (entry.key !== role) change(member, entry.key)
        },
      })),
      { kind: "heading", label: "Access" },
      ...(role
        ? [
            {
              label: "Remove access",
              icon: UserX,
              danger: true,
              disabled: pending,
              onSelect: () => setConfirming({ id: member.id, action: "revoke" }),
            },
          ]
        : []),
      {
        label: "Delete user",
        icon: Trash2,
        danger: true,
        disabled: pending,
        onSelect: () => setConfirming({ id: member.id, action: "delete" }),
      },
    ]
  }

  /** How each optional column renders for one member. */
  function cells(member: TeamMember, role: Role | null): Record<UserColumnKey, ReactNode> {
    return {
      email: (
        <span className="block max-w-[260px] truncate" title={member.email}>
          {member.email}
        </span>
      ),
      role: roleBadge(role),
      lastSignIn: member.lastSignInAt ? (
        <span className="whitespace-nowrap">{date.format(new Date(member.lastSignInAt))}</span>
      ) : (
        <span className="text-neutral-400">Never</span>
      ),
      joined: <span className="whitespace-nowrap">{date.format(new Date(member.joinedAt))}</span>,
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className={TABLE}>
        <caption className="sr-only">Everyone who has signed up, and their role.</caption>
        <thead>
          <tr className={HEAD_ROW}>
            <SortHeader
              label="Profile name"
              icon={CircleUserRound}
              sortKey="user"
              sort={sort}
              direction={direction}
              className="min-w-[220px]"
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
          {visible.map((member) => {
            const role = roleOf(member)
            const me = member.id === meId
            const pendingAction = confirming?.id === member.id ? confirming.action : null
            // Built once per row rather than once per column.
            const rowCells = cells(member, role)

            return (
              <tr key={member.id} className={BODY_ROW}>
                <td className="px-3 py-1.5">
                  <span className="flex items-center gap-2.5">
                    <Avatar name={member.name} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium text-neutral-900">{member.name}</span>
                        {me ? (
                          <span className="rounded bg-neutral-100 px-1.5 text-xs font-medium text-neutral-600">
                            You
                          </span>
                        ) : null}
                      </span>
                      {/* With the email column hidden, it still shows somewhere. */}
                      {columns.includes("email") ? null : (
                        <span className="block truncate text-xs text-neutral-500">{member.email}</span>
                      )}
                    </span>
                  </span>
                </td>

                {columns.map((key) => (
                  <td key={key} className={CELL}>
                    {rowCells[key]}
                  </td>
                ))}

                <td className={ACTION_CELL}>
                  {me ? null : pendingAction ? (
                    <span className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className="cursor-pointer rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          pendingAction === "delete" ? remove(member) : change(member, null)
                        }
                        disabled={pending}
                        className="cursor-pointer rounded bg-rose-600 px-1.5 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-rose-500 disabled:opacity-50"
                      >
                        {pendingAction === "delete" ? "Delete user" : "Remove access"}
                      </button>
                    </span>
                  ) : (
                    <RowMenu label={`Actions for ${member.name}`} items={menu(member, role)} />
                  )}
                </td>
              </tr>
            )
          })}

          {visible.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-neutral-500">
                Nobody matches.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

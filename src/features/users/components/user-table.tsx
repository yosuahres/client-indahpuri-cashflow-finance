"use client"

import { useState, useTransition } from "react"
import { Trash2, UserX } from "lucide-react"

import { Select } from "@/components/form/select"
import type { Role, RoleSummary } from "@/features/auth/roles"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { deleteMember, setMemberRole, type TeamMember } from "../actions"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-2 py-2.5 sm:px-3"

const iconButton = cn(
  "grid size-8 place-items-center rounded-md text-neutral-400",
  "hover:bg-neutral-100 hover:text-rose-600",
  "focus-visible:text-rose-600 focus-visible:outline-2 focus-visible:outline-neutral-800",
  "disabled:pointer-events-none disabled:opacity-40",
)

const joined = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" })

/** The select's value for "no role"; a Select option cannot carry null. */
const NO_ACCESS = ""

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
}: {
  members: TeamMember[]
  roles: RoleSummary[]
  meId: string
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

  const options = [
    ...roleList.map((role) => ({ value: role.key, label: role.name })),
    { value: NO_ACCESS, label: "No access" },
  ]

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Everyone who has signed up, and their role.</caption>
          <thead>
            <tr className="bg-neutral-50">
              <th scope="col" className={cn("min-w-[220px]", headCell)}>
                User
              </th>
              <th scope="col" className={cn("min-w-[170px]", headCell)}>
                Role
              </th>
              <th scope="col" className={cn("min-w-[110px]", headCell)}>
                Joined
              </th>
              <th scope="col" className="w-44 px-2 py-2.5">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {visible.map((member) => {
              const role = roleOf(member)
              const me = member.id === meId
              const pendingAction = confirming?.id === member.id ? confirming.action : null

              return (
                <tr
                  key={member.id}
                  className={cn("border-t border-black/5", !role && "bg-amber-50/40")}
                >
                  <td className={cell}>
                    <span className="font-medium text-neutral-900">{member.name}</span>
                    {me ? (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-600">
                        You
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-xs text-neutral-500">{member.email}</span>
                  </td>

                  <td className="px-2 py-1.5 sm:px-3">
                    {me ? (
                      <span className="text-neutral-700">
                        {roleList.find((entry) => entry.key === role)?.name ?? role}
                      </span>
                    ) : (
                      <div className="w-40">
                        <Select
                          id={`role-${member.id}`}
                          value={role ?? NO_ACCESS}
                          onValueChange={(value) =>
                            change(member, value === NO_ACCESS ? null : value)
                          }
                          options={options}
                          disabled={pending}
                        />
                      </div>
                    )}
                    {!role ? (
                      <span className="mt-1 block text-xs text-amber-700">Waiting for access</span>
                    ) : null}
                  </td>

                  <td className={cn(cell, "whitespace-nowrap text-neutral-600")}>
                    {joined.format(new Date(member.joinedAt))}
                  </td>

                  <td className="w-44 px-2 py-1.5 text-right">
                    {me ? null : pendingAction ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setConfirming(null)}
                          className="rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            pendingAction === "delete" ? remove(member) : change(member, null)
                          }
                          disabled={pending}
                          className="rounded bg-rose-600 px-1.5 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          {pendingAction === "delete" ? "Delete user" : "Remove access"}
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5">
                        {role ? (
                          <button
                            type="button"
                            onClick={() => setConfirming({ id: member.id, action: "revoke" })}
                            disabled={pending}
                            aria-label={`Remove access for ${member.name}`}
                            title="Remove access"
                            className={iconButton}
                          >
                            <UserX className="size-4" strokeWidth={1.75} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setConfirming({ id: member.id, action: "delete" })}
                          disabled={pending}
                          aria-label={`Delete ${member.name}`}
                          title="Delete user"
                          className={iconButton}
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}

            {visible.length === 0 ? (
              <tr className="border-t border-black/5">
                <td colSpan={4} className="px-3 py-6 text-center text-neutral-500">
                  Nobody has signed up yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}

"use client"

import { useState, useTransition } from "react"
import { UserX } from "lucide-react"

import { Select } from "@/components/form/select"
import { ROLES, type Role } from "@/features/auth/roles"
import { cn } from "@/lib/cn"

import { setMemberRole, type TeamMember } from "../actions"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-2 py-2.5 sm:px-3"

const joined = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" })

/** The select's value for "no role"; a Select option cannot carry null. */
const NO_ACCESS = ""

/**
 * Everyone who has signed up, and what each of them may do.
 *
 * A role change applies on pick. Taking access away takes two clicks, as
 * deleting does elsewhere — it does not remove the login, but it does shut
 * someone out mid-task.
 */
export function UserTable({ members, meId }: { members: TeamMember[]; meId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // A change paints before the server answers. Rows arrive fresh after
  // `refresh()`, so a new array means the overrides have been folded in.
  const [roles, setRoles] = useState<ReadonlyMap<string, Role | null>>(new Map())
  const [seenRows, setSeenRows] = useState(members)
  if (members !== seenRows) {
    setSeenRows(members)
    if (roles.size > 0) setRoles(new Map())
  }

  const roleOf = (member: TeamMember) => (roles.has(member.id) ? (roles.get(member.id) ?? null) : member.role)

  function change(member: TeamMember, role: Role | null) {
    setError(null)
    setConfirmingId(null)
    setRoles((current) => new Map(current).set(member.id, role))
    startTransition(async () => {
      const result = await setMemberRole(member.id, role)
      if (!result.ok) {
        setError(result.error ?? "Could not change that role.")
        // Put it back; the server never took the change.
        setRoles((current) => {
          const next = new Map(current)
          next.delete(member.id)
          return next
        })
      }
    })
  }

  const options = [
    ...ROLES.map((role) => ({ value: role.value, label: role.label })),
    { value: NO_ACCESS, label: "No access" },
  ]

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

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
              <th scope="col" className="w-36 px-2 py-2.5">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {members.map((member) => {
              const role = roleOf(member)
              const me = member.id === meId
              const confirming = confirmingId === member.id

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
                        {ROLES.find((entry) => entry.value === role)?.label}
                      </span>
                    ) : (
                      <div className="w-40">
                        <Select
                          id={`role-${member.id}`}
                          value={role ?? NO_ACCESS}
                          onValueChange={(value) =>
                            change(member, value === NO_ACCESS ? null : (value as Role))
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

                  <td className="w-36 px-2 py-1.5 text-right">
                    {me || !role ? null : confirming ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => change(member, null)}
                          disabled={pending}
                          className="rounded bg-rose-600 px-1.5 py-1 text-xs font-medium whitespace-nowrap text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          Remove access
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmingId(member.id)}
                        disabled={pending}
                        aria-label={`Remove access for ${member.name}`}
                        title="Remove access"
                        className={cn(
                          "ml-auto grid size-8 place-items-center rounded-md text-neutral-400",
                          "hover:bg-neutral-100 hover:text-rose-600",
                          "focus-visible:text-rose-600 focus-visible:outline-2 focus-visible:outline-neutral-800",
                          "disabled:pointer-events-none disabled:opacity-40",
                        )}
                      >
                        <UserX className="size-4" strokeWidth={1.75} />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}

            {members.length === 0 ? (
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

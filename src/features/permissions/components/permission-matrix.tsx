"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useState, useTransition } from "react"
import {
  Banknote,
  CalendarClock,
  Check,
  ReceiptText,
  ScanEye,
  ScrollText,
  Settings2,
  UserCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import {
  isLocked,
  PERMISSION_GROUPS,
  type Permission,
  type PermissionGroupKey,
} from "@/features/auth/permissions"
import type { Role, RoleSummary } from "@/features/auth/roles"
import { Select } from "@/components/form/select"
import { BODY_ROW, HEAD_CELL, HEAD_ROW, TABLE, TABLE_FRAME } from "@/components/table/styles"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { setGrant, type Grants } from "../actions"

const GROUP_ICONS: Record<PermissionGroupKey, LucideIcon> = {
  reports: ScanEye,
  transactions: ReceiptText,
  setup: Settings2,
  hris: UsersRound,
  shift: CalendarClock,
  payroll: Banknote,
  users: UserCog,
  audit: ScrollText,
}

function Tick({
  checked,
  disabled,
  locked,
  label,
  onChange,
}: {
  checked: boolean
  disabled: boolean
  locked: boolean
  label: string
  onChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={locked || undefined}
      title={locked ? "Managers always have this" : undefined}
      disabled={disabled}
      onClick={() => {
        if (!locked) onChange(!checked)
      }}
      className={cn(
        "inline-grid size-[18px] place-items-center rounded-[5px] border transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800",
        checked
          ? "border-neutral-900 bg-neutral-900 text-white"
          : "border-neutral-300 bg-white hover:border-neutral-500",
        locked ? "cursor-default opacity-40" : "cursor-pointer disabled:cursor-default",
      )}
    >
      {checked ? <Check className="size-3" strokeWidth={3} /> : null}
    </button>
  )
}

const TOTAL = PERMISSION_GROUPS.reduce((sum, group) => sum + group.permissions.length, 0)

/**
 * One role's permissions at a time, picked at the top: a grid with a column
 * per role stops fitting once a team has more than a few. A tick applies as
 * soon as it is clicked. The role sits in the URL, so Roles can link here.
 */
export function PermissionMatrix({
  roles,
  role,
  grants,
  disabled,
}: {
  roles: RoleSummary[]
  /** The role being edited. */
  role: Role
  grants: Grants
  disabled?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  // A tick paints before the server answers. Fresh grants after `refresh()`
  // mean the overrides have been folded in.
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [seenGrants, setSeenGrants] = useState(grants)
  if (grants !== seenGrants) {
    setSeenGrants(grants)
    if (overrides.size > 0) setOverrides(new Map())
  }

  const cellKey = (role: Role, permission: Permission) => `${role}:${permission}`
  const isGranted = (role: Role, permission: Permission) =>
    overrides.get(cellKey(role, permission)) ?? (grants[role] ?? []).includes(permission)

  function change(role: Role, permission: Permission, granted: boolean) {
    const key = cellKey(role, permission)
    setOverrides((current) => new Map(current).set(key, granted))
    startTransition(async () => {
      const result = await setGrant(role, permission, granted)
      if (result.ok) return
      toast.error(result.error ?? "Could not change that permission.")
      // Put it back; the server never took the change.
      setOverrides((current) => {
        const next = new Map(current)
        next.delete(key)
        return next
      })
    })
  }

  function pick(next: string) {
    const params = new URLSearchParams(searchParams)
    params.set("role", next)
    router.replace(`${pathname}?${params}`, { scroll: false })
  }

  const name = roles.find((entry) => entry.key === role)?.name ?? role
  const granted = PERMISSION_GROUPS.reduce(
    (sum, group) =>
      sum + group.permissions.filter((permission) => isGranted(role, permission.key)).length,
    0,
  )

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <label htmlFor="permission-role" className="text-lg font-semibold tracking-tight text-neutral-900">
            Role
          </label>
          <div className="w-full sm:w-64">
            <Select
              id="permission-role"
              value={role}
              onValueChange={pick}
              options={roles.map((entry) => ({ value: entry.key, label: entry.name }))}
            />
          </div>
        </div>
        <p className="text-sm text-neutral-500 tabular-nums">
          {granted} of {TOTAL} allowed
        </p>
      </div>

      <div className={TABLE_FRAME}>
        <table className={TABLE}>
          <caption className="sr-only">What {name} may do.</caption>
          <thead>
            <tr className={HEAD_ROW}>
              <th scope="col" className={HEAD_CELL}>
                Permission
              </th>
              <th scope="col" className={cn(HEAD_CELL, "w-24 text-center")}>
                Allowed
              </th>
            </tr>
          </thead>

          {PERMISSION_GROUPS.map((group) => {
            const Icon = GROUP_ICONS[group.key]

            return (
              <tbody key={group.key}>
                <tr className="border-b border-black/12 bg-neutral-50/60">
                  <th
                    scope="colgroup"
                    colSpan={2}
                    className="px-3 py-2 text-left font-semibold text-neutral-900"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="size-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
                      {group.label}
                    </span>
                  </th>
                </tr>

                {group.permissions.map((permission) => (
                  <tr key={permission.key} className={cn(BODY_ROW, "last:border-b")}>
                    <th scope="row" className="px-3 py-2 text-left font-normal text-neutral-800">
                      {permission.label}
                    </th>
                    <td className="w-24 px-3 py-2 text-center">
                      <Tick
                        label={permission.label}
                        checked={isGranted(role, permission.key)}
                        locked={isLocked(role, permission.key)}
                        disabled={Boolean(disabled)}
                        onChange={(checked) => change(role, permission.key, checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            )
          })}
        </table>
      </div>
    </>
  )
}

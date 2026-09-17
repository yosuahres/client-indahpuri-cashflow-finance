"use client"

import { useState, useTransition } from "react"
import {
  Check,
  ReceiptText,
  ScanEye,
  Settings2,
  UserCog,
  type LucideIcon,
} from "lucide-react"

import {
  isLocked,
  PERMISSION_GROUPS,
  type Permission,
  type PermissionGroupKey,
} from "@/features/auth/permissions"
import type { Role, RoleSummary } from "@/features/auth/roles"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"

import { setGrant, type Grants } from "../actions"

const GROUP_ICONS: Record<PermissionGroupKey, LucideIcon> = {
  reports: ScanEye,
  transactions: ReceiptText,
  setup: Settings2,
  users: UserCog,
}

const roleCell = "w-24 px-2 text-center sm:w-32 sm:px-3"

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

/**
 * The permission grid: one row per action, one column per role. A tick applies
 * as soon as it is clicked.
 */
export function PermissionMatrix({
  roles,
  grants,
  disabled,
}: {
  roles: RoleSummary[]
  grants: Grants
  disabled?: boolean
}) {
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">What each role may do.</caption>
        <thead>
          <tr className="border-b border-black/8">
            <th scope="col" className="min-w-[220px] px-4 py-3 text-left font-normal text-neutral-500 sm:px-5">
              Actions
            </th>
            {roles.map((role) => (
              <th key={role.key} scope="col" className={cn(roleCell, "py-3 font-medium text-neutral-700")}>
                {role.name}
              </th>
            ))}
          </tr>
        </thead>

        {PERMISSION_GROUPS.map((group) => {
          const Icon = GROUP_ICONS[group.key]

          return (
            <tbody key={group.key}>
              <tr className="border-b border-black/8 bg-neutral-50">
                <th
                  scope="colgroup"
                  colSpan={1 + roles.length}
                  className="px-4 py-2.5 text-left font-semibold text-neutral-900 sm:px-5"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
                    {group.label}
                  </span>
                </th>
              </tr>

              {group.permissions.map((permission) => (
                <tr key={permission.key} className="border-b border-black/5 last:border-black/8">
                  <th scope="row" className="px-4 py-3.5 text-left font-normal text-neutral-800 sm:px-5">
                    {permission.label}
                  </th>
                  {roles.map((role) => (
                    <td key={role.key} className={cn(roleCell, "py-3.5")}>
                      <Tick
                        label={`${permission.label} — ${role.name}`}
                        checked={isGranted(role.key, permission.key)}
                        locked={isLocked(role.key, permission.key)}
                        disabled={Boolean(disabled)}
                        onChange={(checked) => change(role.key, permission.key, checked)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )
        })}
      </table>
    </div>
  )
}

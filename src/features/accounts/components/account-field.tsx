"use client"

import { usePathname, useRouter } from "next/navigation"
import { Plus } from "lucide-react"

import { Select } from "@/components/form/select"

import type { Account } from "../actions"
import { accountTypeSpec } from "../constants"

/**
 * Account dropdown. Unlike categories, creating one goes to its own page —
 * an account carries bank details and flags, which is more than a popup should
 * ask for.
 */
export function AccountField({
  id,
  name,
  value,
  onValueChange,
  accounts,
  invalid,
}: {
  id: string
  name: string
  value: string
  onValueChange: (value: string) => void
  accounts: Account[]
  invalid?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()

  const options = accounts.map((account) => ({
    value: account.name,
    // Two accounts at the same bank need more than the name to tell apart.
    label: [account.name, account.provider ?? account.holder, accountTypeSpec(account.type).label]
      .filter(Boolean)
      .join(" · "),
  }))

  return (
    <Select
      id={id}
      name={name}
      value={value}
      onValueChange={onValueChange}
      options={options}
      invalid={invalid}
      placeholder={options.length === 0 ? "No accounts yet — create one" : "Select an account…"}
      footer={(close) => (
        <button
          type="button"
          onClick={() => {
            close()
            // Come back here once the account is saved.
            router.push(`/accounts/new?next=${encodeURIComponent(pathname)}`)
          }}
          className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Plus className="size-4 text-neutral-500" strokeWidth={2} />
          Create new account
        </button>
      )}
    />
  )
}

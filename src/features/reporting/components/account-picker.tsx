"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Select } from "@/components/form/select"
import type { Account } from "@/features/accounts/actions"
import { cn } from "@/lib/cn"

/**
 * Narrows the statement to one account. It sits in the URL alongside the month
 * so the view stays shareable and the export link picks it up unchanged.
 */
export function AccountPicker({
  accounts,
  account,
}: {
  accounts: Account[]
  /** Empty totals every account, which is what the statement opens on. */
  account: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  return (
    <div className={cn("w-56", pending && "opacity-60")}>
      <label htmlFor="report-account" className="sr-only">
        Akun
      </label>
      <Select
        id="report-account"
        value={account}
        onValueChange={(value) => {
          const params = new URLSearchParams(searchParams)
          if (value) params.set("account", value)
          else params.delete("account")
          startTransition(() => {
            router.replace(`${pathname}?${params}`, { scroll: false })
          })
        }}
        options={[
          { value: "", label: "Semua akun" },
          ...accounts.map((entry) => ({ value: entry.name, label: entry.name })),
        ]}
      />
    </div>
  )
}

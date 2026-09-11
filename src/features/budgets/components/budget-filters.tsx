"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Select } from "@/components/form/select"
import type { Account } from "@/features/accounts/actions"
import { cn } from "@/lib/cn"
import { BUDGET_PERIODS } from "@/lib/finance"
import { MONTH_OPTIONS, yearOptions, type BudgetPeriodSelection } from "../period"

/**
 * The period the Anggaran list is scoped to. It sits in the URL rather than in
 * state, so the view is shareable and the rows are re-read on the server.
 */
export function BudgetFilters({
  selection,
  thisYear,
  accounts,
  account,
}: {
  selection: BudgetPeriodSelection
  /** Centres the year list on the year being lived in, not the one on screen. */
  thisYear: number
  accounts: Account[]
  /** Empty shows every account's plans side by side. */
  account: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function setParams(entries: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(entries)) params.set(key, value)
    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false })
    })
  }

  const monthly = selection.period === "monthly"

  return (
    <div
      className={cn(
        "flex flex-wrap items-end gap-3 px-4 py-3 sm:px-6 sm:py-4",
        pending && "opacity-60",
      )}
    >
      <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-44">
        <label htmlFor="budget-period" className="text-sm text-neutral-600">
          Period Type
        </label>
        <Select
          id="budget-period"
          value={selection.period}
          onValueChange={(value) => setParams({ period: value })}
          options={BUDGET_PERIODS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </div>

      <div className="flex w-full min-w-0 flex-col gap-1.5 sm:w-56">
        <label htmlFor="budget-account" className="text-sm text-neutral-600">
          Account
        </label>
        <Select
          id="budget-account"
          value={account}
          onValueChange={(value) => setParams({ account: value })}
          options={[
            { value: "", label: "All accounts" },
            ...accounts.map((entry) => ({ value: entry.name, label: entry.name })),
          ]}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:flex-none">
        {/* One heading over the pair; each control still carries its own name
            for anyone who reaches it without seeing the heading. */}
        <span className="text-sm text-neutral-600">Period</span>
        <div className="flex gap-3">
          {monthly ? (
            <div className="min-w-0 flex-1 sm:w-40 sm:flex-none">
              <label htmlFor="budget-month" className="sr-only">
                Month
              </label>
              <Select
                id="budget-month"
                value={String(selection.month)}
                onValueChange={(value) => setParams({ month: value })}
                options={MONTH_OPTIONS}
              />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 sm:w-28 sm:flex-none">
            <label htmlFor="budget-year" className="sr-only">
              Year
            </label>
            <Select
              id="budget-year"
              value={String(selection.year)}
              onValueChange={(value) => setParams({ year: value })}
              options={yearOptions(thisYear, { back: 5, ahead: 5 })}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

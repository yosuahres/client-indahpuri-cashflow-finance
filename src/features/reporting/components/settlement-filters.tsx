"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Select } from "@/components/form/select"
import { cn } from "@/lib/cn"
import type { SettlementFilter } from "@/features/reports/range"

export function SettlementFilters({
  incomeStatus,
  expenseStatus,
}: {
  incomeStatus: SettlementFilter
  expenseStatus: SettlementFilter
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function setStatus(key: "incomeStatus" | "expenseStatus", value: string) {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false })
    })
  }

  return (
    <div className={cn("flex flex-wrap gap-2", pending && "opacity-60")}>
      <Select
        id="report-income-status"
        value={incomeStatus}
        onValueChange={(value) => setStatus("incomeStatus", value)}
        options={[
          { value: "paid", label: "Income: Setor" },
          { value: "unpaid", label: "Income: Belum setor" },
          { value: "all", label: "Income: Semua" },
        ]}
      />
      <Select
        id="report-expense-status"
        value={expenseStatus}
        onValueChange={(value) => setStatus("expenseStatus", value)}
        options={[
          { value: "paid", label: "Expense: Paid" },
          { value: "unpaid", label: "Expense: Unpaid" },
          { value: "all", label: "Expense: Semua" },
        ]}
      />
    </div>
  )
}

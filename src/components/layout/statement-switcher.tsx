"use client"

import { useRouter } from "next/navigation"

import { Select } from "@/components/form/select"

export const STATEMENTS = [
  { value: "/cash-flow", label: "Cash Flow Statement" },
  { value: "/profit-and-loss", label: "Profit and Loss" },
] as const

/**
 * Switches between financial statements. The trigger always reads "Financial
 * Statements" — it names the menu, not the current selection, which the
 * breadcrumb already shows.
 */
export function StatementSwitcher({ current }: { current: string }) {
  const router = useRouter()

  return (
    <div className="w-52">
      <Select
        id="statement"
        value={current}
        onValueChange={(href) => {
          if (href !== current) router.push(href)
        }}
        options={STATEMENTS.map((entry) => ({ value: entry.value, label: entry.label }))}
        triggerLabel="Financial Statements"
      />
    </div>
  )
}

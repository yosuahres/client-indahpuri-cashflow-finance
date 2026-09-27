import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { loadRoster } from "@/features/employees/roster"
import { loadLeaveBudgets } from "@/features/leave/budgets"
import { LeaveForm } from "@/features/leave/components/leave-form"
import { listLeaveTypes } from "@/features/leave/type-actions"

export const metadata: Metadata = {
  title: "Record Leave",
}

export default async function NewLeavePage() {
  await requirePermission("leave.manage")
  const today = new Date().toISOString().slice(0, 10)
  const year = Number(today.slice(0, 4))
  // Next year too: leave booked in December for January draws on that.
  const [roster, budgets, types] = await Promise.all([
    loadRoster(),
    loadLeaveBudgets([year, year + 1]),
    listLeaveTypes(),
  ])
  const notice = roster.error ?? types.error ?? budgets.error

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {notice ? (
        <p
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {notice}
        </p>
      ) : null}

      <LeaveForm
        roster={roster.employees}
        types={types.types}
        budgets={budgets.budgets}
        today={today}
      />
    </div>
  )
}

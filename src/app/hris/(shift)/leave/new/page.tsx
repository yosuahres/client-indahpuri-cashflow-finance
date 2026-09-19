import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { loadRoster } from "@/features/employees/roster"
import { LeaveForm } from "@/features/leave/components/leave-form"

export const metadata: Metadata = {
  title: "Record Leave",
}

export default async function NewLeavePage() {
  await requirePermission("leave.manage")
  const roster = await loadRoster()
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {!roster.ok ? (
        <p
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {roster.error}
        </p>
      ) : null}

      <LeaveForm roster={roster.employees} today={today} />
    </div>
  )
}

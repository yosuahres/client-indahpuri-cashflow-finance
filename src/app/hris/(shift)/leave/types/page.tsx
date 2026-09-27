import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listLeave } from "@/features/leave/actions"
import { LeaveTypeTable } from "@/features/leave/components/leave-type-table"
import { listLeaveTypes } from "@/features/leave/type-actions"

export const metadata: Metadata = {
  title: "Leave Types",
}

export default async function LeaveTypesPage() {
  await requirePermission("leave.manage")
  const [result, leave] = await Promise.all([listLeaveTypes(), listLeave()])

  const usage: Record<string, number> = {}
  for (const entry of leave.entries) usage[entry.leaveTypeId] = (usage[entry.leaveTypeId] ?? 0) + 1

  return (
    <>
      <Topbar
        title="Leave Types"
        section="Setup"
        actions={
          <Link href="/hris/leave/types/new" className={TOPBAR_ACTION_CLASS}>
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Add Leave Type</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <p className="border-b border-black/8 px-4 py-2.5 text-sm text-neutral-500 sm:px-6">
          The kinds of leave people can take. Each can have a budget per person on Leave Budgets.
        </p>

        {!result.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto">
          <LeaveTypeTable types={result.types} usage={usage} />
        </div>
      </main>
    </>
  )
}

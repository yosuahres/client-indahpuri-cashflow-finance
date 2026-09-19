import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listLeave } from "@/features/leave/actions"
import { LeaveFilter, LeaveTable } from "@/features/leave/components/leave-table"
import { LEAVE_STATUSES, type LeaveStatusValue } from "@/features/leave/constants"

export const metadata: Metadata = {
  title: "Leave",
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("leave.manage")
  const params = await searchParams

  const asked = typeof params.status === "string" ? params.status : ""
  // A status the URL cannot mean shows everything rather than nothing.
  const status = LEAVE_STATUSES.some((entry) => entry.value === asked)
    ? (asked as LeaveStatusValue)
    : undefined

  const result = await listLeave(status)

  return (
    <>
      <Topbar
        title="Leave"
        section={null}
        actions={
          <Link
            href="/hris/leave/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 sm:h-8"
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Record Leave</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <LeaveFilter status={status ?? ""} />

        {!result.ok ? (
          <p
            role="alert"
            className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto border-t border-black/8">
          <LeaveTable entries={result.entries} />
        </div>
      </main>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listLeave } from "@/features/leave/actions"
import { LeaveList } from "@/features/leave/components/leave-list"
import { applyLeaveQuery, readLeaveQuery } from "@/features/leave/query"
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
  const query = readLeaveQuery(params)

  return (
    <>
      <Topbar
        title="Leave"
        section={null}
        actions={
          <Link
            href="/hris/leave/new"
            className={TOPBAR_ACTION_CLASS}
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Record Leave</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <LeaveList
          entries={applyLeaveQuery(result.entries, query)}
          status={status ?? ""}
          query={query}
          notice={result.ok ? undefined : result.error}
        />
      </main>
    </>
  )
}

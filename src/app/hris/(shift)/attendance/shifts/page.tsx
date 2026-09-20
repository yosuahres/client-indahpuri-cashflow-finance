import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listShifts } from "@/features/shifts/actions"
import { ShiftList } from "@/features/shifts/components/shift-list"
import { applyShiftQuery, readShiftQuery } from "@/features/shifts/query"
import { loadShiftHeadcount } from "@/features/shifts/headcount"

export const metadata: Metadata = {
  title: "Shifts",
}

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("attendance.manage")
  const [params, result, headcount] = await Promise.all([
    searchParams,
    listShifts(),
    loadShiftHeadcount(),
  ])
  const query = readShiftQuery(params)

  return (
    <>
      <Topbar
        title="Shifts"
        section="Setup"
        actions={
          <Link
            href="/hris/attendance/shifts/new"
            className={TOPBAR_ACTION_CLASS}
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Add Shift</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <p className="border-b border-black/8 px-4 py-2.5 text-sm text-neutral-500 sm:px-6">
          A shift says when someone is due in and due out. Pick one on an employee to set their
          hours.
        </p>

        <ShiftList
          shifts={applyShiftQuery(result.shifts, query, headcount)}
          headcount={headcount}
          query={query}
          notice={result.ok ? undefined : result.error}
        />
      </main>
    </>
  )
}

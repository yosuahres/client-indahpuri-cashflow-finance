import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listShifts } from "@/features/shifts/actions"
import { ShiftTable } from "@/features/shifts/components/shift-table"
import { loadShiftHeadcount } from "@/features/shifts/headcount"

export const metadata: Metadata = {
  title: "Shifts",
}

export default async function ShiftsPage() {
  await requirePermission("attendance.manage")
  const [result, headcount] = await Promise.all([listShifts(), loadShiftHeadcount()])

  return (
    <>
      <Topbar
        title="Shifts"
        section="Setup"
        actions={
          <Link
            href="/hris/attendance/shifts/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 sm:h-8"
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Add Shift</span>
          </Link>
        }
      />

      <main className="min-h-0 flex-1 overflow-auto">
        {!result.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <p className="border-b border-black/8 px-4 py-2.5 text-sm text-neutral-500 sm:px-6">
          A shift says when someone is due in and due out. Pick one on an employee to set their
          hours.
        </p>

        <ShiftTable shifts={result.shifts} headcount={headcount} />
      </main>
    </>
  )
}

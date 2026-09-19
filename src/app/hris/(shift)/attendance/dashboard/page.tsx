import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { Topbar } from "@/components/layout/topbar"
import { CARD_ACTION_CLASS } from "@/components/ui/card"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/features/auth/session"
import { AttendanceCountChart } from "@/features/attendance/components/attendance-count-chart"
import { loadShiftDashboard } from "@/features/attendance/shift-dashboard"
import { BreakdownList } from "@/features/employees/components/breakdown-list"
import { StatTiles } from "@/features/employees/components/stat-tiles"

export const metadata: Metadata = {
  title: "Shift Dashboard",
}

function DashboardFallback() {
  return (
    <LoadingRegion label="Loading the attendance figures">
      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-[82px]" />
          ))}
        </div>
        <Skeleton className="h-[280px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </LoadingRegion>
  )
}

async function ShiftFigures() {
  const today = new Date().toISOString().slice(0, 10)
  const month = today.slice(0, 7)
  const { ok, error, dashboard } = await loadShiftDashboard(month, today)

  const hours = Math.round(dashboard.minutes / 60)

  return (
    <>
      {!ok ? (
        <p
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        <StatTiles
          tiles={[
            {
              label: "Total Present",
              value: String(dashboard.present),
              description: "Days marked present this month",
            },
            {
              label: "Total Absent",
              value: String(dashboard.absent),
              description: "Days marked absent this month",
            },
            {
              label: "Late Entry",
              value: String(dashboard.late),
              description: "Days marked late this month",
            },
            {
              label: "Hours Logged",
              value: String(hours),
              // Only days with both clocks can be counted, so the figure is a
              // floor rather than the whole month's hours.
              description: `${dashboard.clockedDays} days with both clocks`,
            },
          ]}
        />

        <AttendanceCountChart days={dashboard.perDay} />

        <BreakdownList
          title="Department wise Hours"
          caption="Hours clocked this month, from check-in to check-out. Days missing either clock are left out."
          slices={dashboard.hoursByDepartment}
          emptyLabel="No clocked hours this month yet."
          action={
            <Link href="/hris/attendance" className={CARD_ACTION_CLASS}>
              Take attendance
            </Link>
          }
        />
      </div>
    </>
  )
}

export default async function ShiftDashboardPage() {
  await requirePermission("attendance.manage")

  return (
    <>
      <Topbar title="Dashboard" section={null} />

      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
        <Suspense fallback={<DashboardFallback />}>
          <ShiftFigures />
        </Suspense>
      </main>
    </>
  )
}

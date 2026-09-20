import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { loadAttendanceDay } from "@/features/attendance/actions"
import { AttendanceList } from "@/features/attendance/components/attendance-list"
import { applyAttendanceQuery, readAttendanceQuery } from "@/features/attendance/query"
import { DayPicker } from "@/features/attendance/components/day-picker"
import {
  ATTENDANCE_STATUSES,
  type AttendanceStatusValue,
} from "@/features/attendance/constants"
import { loadRoster } from "@/features/employees/roster"

export const metadata: Metadata = {
  title: "Attendance",
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("attendance.manage")
  const params = await searchParams

  const today = new Date().toISOString().slice(0, 10)
  const asked = typeof params.date === "string" ? params.date : ""
  // A date the URL cannot mean falls back to today rather than an empty sheet.
  const date = ISO_DATE.test(asked) ? asked : today

  const [roster, day] = await Promise.all([loadRoster(), loadAttendanceDay(date)])

  const departments = [
    ...new Set(roster.employees.flatMap((employee) => employee.department ?? [])),
  ].sort((a, b) => a.localeCompare(b))
  const query = readAttendanceQuery(params, departments)
  const shown = applyAttendanceQuery(roster.employees, query, day.entries)

  // What the sheet already says, counted for the line above it.
  const tally = new Map<AttendanceStatusValue, number>()
  for (const employee of roster.employees) {
    const status = day.entries[employee.id]?.status
    if (status) tally.set(status, (tally.get(status) ?? 0) + 1)
  }
  const recorded = [...tally.values()].reduce((total, count) => total + count, 0)
  const summary = ATTENDANCE_STATUSES.filter((status) => tally.get(status.value))
    .map((status) => `${tally.get(status.value)} ${status.label.toLowerCase()}`)
    .join(", ")

  return (
    <>
      <Topbar title="Attendance" section={null} />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-black/8">
          <DayPicker date={date} today={today} />
        </div>

        {!roster.ok || !day.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {roster.error ?? day.error}
          </p>
        ) : null}

        <p className="shrink-0 border-b border-black/8 px-4 py-2.5 text-sm text-neutral-500 sm:px-6">
          {recorded === 0
            ? `Nothing recorded yet for ${roster.employees.length} on the roll.`
            : `${recorded} of ${roster.employees.length} recorded — ${summary}.`}
        </p>

        <AttendanceList
          date={date}
          roster={shown}
          entries={day.entries}
          departments={departments}
          query={query}
        />
      </main>
    </>
  )
}

export type LeaveStatusValue = "pending" | "approved" | "rejected"

export const LEAVE_STATUSES: { value: LeaveStatusValue; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export function leaveStatusLabel(value: LeaveStatusValue) {
  return LEAVE_STATUSES.find((status) => status.value === value)?.label ?? value
}

/**
 * Calendar days a spell covers, both ends included. Weekends and public
 * holidays are counted: there is no working calendar on file to take them off,
 * and the entitlement check in the database (0029 §3) counts the same way.
 */
export function leaveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  return Math.round((end - start) / 86_400_000) + 1
}

/** The days of a spell that fall inside one calendar year. */
export function leaveDaysInYear(startDate: string, endDate: string, year: number): number {
  const from = startDate < `${year}-01-01` ? `${year}-01-01` : startDate
  const to = endDate > `${year}-12-31` ? `${year}-12-31` : endDate
  return leaveDays(from, to)
}

/** A day count as it reads in a table: "12", "7.5". */
export function formatDays(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

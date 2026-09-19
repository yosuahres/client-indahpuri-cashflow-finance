export type LeaveTypeValue = "annual" | "sick" | "unpaid" | "maternity" | "other"

export const LEAVE_TYPES: { value: LeaveTypeValue; label: string }[] = [
  { value: "annual", label: "Annual" },
  { value: "sick", label: "Sick" },
  { value: "unpaid", label: "Unpaid" },
  { value: "maternity", label: "Maternity" },
  { value: "other", label: "Other" },
]

export type LeaveStatusValue = "pending" | "approved" | "rejected"

export const LEAVE_STATUSES: { value: LeaveStatusValue; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
]

export function leaveTypeLabel(value: LeaveTypeValue) {
  return LEAVE_TYPES.find((type) => type.value === value)?.label ?? value
}

export function leaveStatusLabel(value: LeaveStatusValue) {
  return LEAVE_STATUSES.find((status) => status.value === value)?.label ?? value
}

/**
 * Calendar days a spell covers, both ends included. Weekends and public
 * holidays are counted: there is no working calendar on file to take them off,
 * so this is the length of the spell, not a deduction from an entitlement.
 */
export function leaveDays(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`)
  const end = Date.parse(`${endDate}T00:00:00Z`)
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return 0
  return Math.round((end - start) / 86_400_000) + 1
}

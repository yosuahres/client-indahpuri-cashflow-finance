export type AttendanceStatusValue = "present" | "late" | "absent" | "leave" | "holiday"

export const ATTENDANCE_STATUSES: { value: AttendanceStatusValue; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "leave", label: "On Leave" },
  { value: "holiday", label: "Holiday" },
]

export function attendanceStatusLabel(value: AttendanceStatusValue) {
  return ATTENDANCE_STATUSES.find((status) => status.value === value)?.label ?? value
}

/** Days nobody is expected to clock in and out on. */
export const NON_WORKING: AttendanceStatusValue[] = ["absent", "leave", "holiday"]

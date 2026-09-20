import type { TableColumn } from "@/components/table/columns"

/**
 * The attendance sheet's optional columns. The employee is the first column
 * and names the row, so it always shows.
 */
export type AttendanceColumnKey = "department" | "status" | "checkIn" | "checkOut" | "note"

export const ATTENDANCE_COLUMNS: TableColumn<AttendanceColumnKey>[] = [
  { key: "department", label: "Department", width: "min-w-[160px]" },
  { key: "status", label: "Status", width: "min-w-[170px]" },
  { key: "checkIn", label: "Check In", width: "min-w-[120px]" },
  { key: "checkOut", label: "Check Out", width: "min-w-[120px]" },
  { key: "note", label: "Note", width: "min-w-[200px]" },
]

/** The department rides under the name by default, so it is not a column too. */
export const DEFAULT_ATTENDANCE_COLUMNS: AttendanceColumnKey[] = [
  "status",
  "checkIn",
  "checkOut",
  "note",
]

/** Where the chosen columns and their order are remembered, per browser. */
export const ATTENDANCE_COLUMNS_STORAGE_KEY = "hris.attendance.columns"

export type AttendanceSortValue = "name" | "employeeNo" | "department" | "status"

export const ATTENDANCE_SORTS: { value: AttendanceSortValue; label: string }[] = [
  { value: "name", label: "Employee" },
  { value: "employeeNo", label: "Employee ID" },
  { value: "department", label: "Department" },
  { value: "status", label: "Status" },
]

export const DEFAULT_ATTENDANCE_SORT: AttendanceSortValue = "name"

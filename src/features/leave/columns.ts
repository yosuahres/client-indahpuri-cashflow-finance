import type { TableColumn } from "@/components/table/columns"

/**
 * The leave table's optional columns. The employee is the first column and
 * names the row, so it always shows.
 */
export type LeaveColumnKey =
  | "leaveType"
  | "days"
  | "startDate"
  | "endDate"
  | "length"
  | "status"
  | "reason"
  | "createdAt"

export const LEAVE_COLUMNS: TableColumn<LeaveColumnKey>[] = [
  { key: "leaveType", label: "Type", width: "min-w-[110px]" },
  { key: "days", label: "Days", width: "min-w-[200px]" },
  { key: "startDate", label: "From", width: "min-w-[120px]" },
  { key: "endDate", label: "To", width: "min-w-[120px]" },
  { key: "length", label: "Length", width: "min-w-[70px]" },
  { key: "status", label: "Status", width: "min-w-[100px]" },
  { key: "reason", label: "Reason", width: "min-w-[160px]" },
  { key: "createdAt", label: "Filed", width: "min-w-[120px]" },
]

/** What the list opens on; the rest are offered through the Columns menu. */
export const DEFAULT_LEAVE_COLUMNS: LeaveColumnKey[] = [
  "leaveType",
  "days",
  "length",
  "status",
  "reason",
]

/** Where the chosen columns and their order are remembered, per browser. */
export const LEAVE_COLUMNS_STORAGE_KEY = "hris.leave.columns"

export type LeaveSortValue = "employee" | LeaveColumnKey

export const LEAVE_SORTS: { value: LeaveSortValue; label: string }[] = [
  { value: "employee", label: "Employee" },
  ...LEAVE_COLUMNS.map((column) => ({
    value: column.key as LeaveSortValue,
    label: column.label,
  })),
]

export const DEFAULT_LEAVE_SORT: LeaveSortValue = "startDate"

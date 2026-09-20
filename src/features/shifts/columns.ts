import type { TableColumn } from "@/components/table/columns"

/**
 * The shifts table's optional columns. The shift's name and colour are the
 * first column and name the row, so they always show.
 */
export type ShiftColumnKey = "hours" | "startsAt" | "endsAt" | "length" | "headcount" | "createdAt"

export const SHIFT_COLUMNS: TableColumn<ShiftColumnKey>[] = [
  { key: "hours", label: "Hours", width: "min-w-[180px]" },
  { key: "startsAt", label: "Starts", width: "min-w-[100px]" },
  { key: "endsAt", label: "Ends", width: "min-w-[100px]" },
  { key: "length", label: "Length", width: "min-w-[90px]" },
  { key: "headcount", label: "Employees", width: "min-w-[110px]" },
  { key: "createdAt", label: "Added", width: "min-w-[120px]" },
]

/** What the list opens on; the rest are offered through the Columns menu. */
export const DEFAULT_SHIFT_COLUMNS: ShiftColumnKey[] = ["hours", "length", "headcount"]

/** Where the chosen columns and their order are remembered, per browser. */
export const SHIFT_COLUMNS_STORAGE_KEY = "hris.shifts.columns"

export type ShiftSortValue = "name" | ShiftColumnKey

export const SHIFT_SORTS: { value: ShiftSortValue; label: string }[] = [
  { value: "name", label: "Shift" },
  ...SHIFT_COLUMNS.map((column) => ({
    value: column.key as ShiftSortValue,
    label: column.label,
  })),
]

export const DEFAULT_SHIFT_SORT: ShiftSortValue = "startsAt"

import type { TableColumn } from "@/components/table/columns"

/**
 * The departments table's optional columns. The name itself is the first
 * column and names the row, so it always shows.
 */
export type DepartmentColumnKey = "headcount" | "createdAt"

export const DEPARTMENT_COLUMNS: TableColumn<DepartmentColumnKey>[] = [
  { key: "headcount", label: "Employees", width: "min-w-[120px]" },
  { key: "createdAt", label: "Added", width: "min-w-[120px]" },
]

export const DEFAULT_DEPARTMENT_COLUMNS: DepartmentColumnKey[] = ["headcount"]

/** Where the chosen columns and their order are remembered, per browser. */
export const DEPARTMENT_COLUMNS_STORAGE_KEY = "hris.departments.columns"

export type DepartmentSortValue = "name" | DepartmentColumnKey

export const DEPARTMENT_SORTS: { value: DepartmentSortValue; label: string }[] = [
  { value: "name", label: "Department" },
  ...DEPARTMENT_COLUMNS.map((column) => ({
    value: column.key as DepartmentSortValue,
    label: column.label,
  })),
]

export const DEFAULT_DEPARTMENT_SORT: DepartmentSortValue = "name"

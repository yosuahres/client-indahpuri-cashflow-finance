import type { TableColumn } from "@/components/table/columns"

import { EMPLOYEE_FIELDS, type FieldType } from "./fields"

/**
 * Every column the employee table can show: one per field on the person, plus
 * the date the record was entered. Full Name is not among them — it is the
 * sticky first column and carries the link into the record, so it always shows.
 */
export type EmployeeColumnKey = string

/** How wide a column of each kind wants to be. */
const WIDTH: Record<FieldType, string> = {
  text: "min-w-[160px]",
  date: "min-w-[120px]",
  money: "min-w-[140px]",
  choice: "min-w-[120px]",
  department: "min-w-[160px]",
  shift: "min-w-[140px]",
}

export const EMPLOYEE_COLUMNS: TableColumn<EmployeeColumnKey>[] = [
  ...EMPLOYEE_FIELDS.filter((field) => field.name !== "fullName").map((field) => ({
    key: field.name,
    label: field.label,
    width: WIDTH[field.type],
  })),
  { key: "createdAt", label: "Added", width: "min-w-[120px]" },
]

/**
 * What the table opens on: who someone is and where they sit. Everything else
 * is a field on the record, offered through the Columns menu.
 */
export const DEFAULT_EMPLOYEE_COLUMNS = [
  "employeeNo",
  "position",
  "department",
  "employmentType",
  "joinDate",
  "status",
]

/** Where the chosen columns and their order are remembered, per browser. */
export const EMPLOYEE_COLUMNS_STORAGE_KEY = "hris.employees.columns"

/** How each column's value is read and formatted, by the field's own type. */
export const EMPLOYEE_COLUMN_TYPES: Record<EmployeeColumnKey, FieldType | "timestamp"> = {
  ...Object.fromEntries(EMPLOYEE_FIELDS.map((field) => [field.name, field.type])),
  createdAt: "timestamp",
}

/** Anything on the record can order the list, Full Name included. */
export const EMPLOYEE_SORTS = [
  { value: "fullName", label: "Full Name" },
  ...EMPLOYEE_COLUMNS.map((column) => ({ value: column.key, label: column.label })),
]

export const DEFAULT_EMPLOYEE_SORT = "fullName"

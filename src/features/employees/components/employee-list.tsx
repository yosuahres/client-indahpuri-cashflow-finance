"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"

import type { Employee } from "../actions"
import {
  DEFAULT_EMPLOYEE_COLUMNS,
  DEFAULT_EMPLOYEE_SORT,
  EMPLOYEE_COLUMNS,
  EMPLOYEE_COLUMNS_STORAGE_KEY,
  EMPLOYEE_SORTS,
} from "../columns"
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "../constants"
import type { EmployeeQuery } from "../query"
import { EmployeeTable } from "./employee-table"

/**
 * The roll and the controls above it. The chosen columns are read here because
 * the menu that picks them sits in the toolbar while the table renders them.
 */
export function EmployeeList({
  employees,
  departments,
  positions,
  query,
  notice,
}: {
  employees: Employee[]
  /** Every department someone is filed under. */
  departments: string[]
  /** Every position someone holds. */
  positions: string[]
  query: EmployeeQuery
  /** Shown above the rows when the roll could not be read in full. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    EMPLOYEE_COLUMNS_STORAGE_KEY,
    DEFAULT_EMPLOYEE_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search employees"
        searchPlaceholder="Search any field on the record"
        filters={[
          {
            key: "department",
            label: "Department",
            allLabel: "All departments",
            value: query.department,
            options: departments.map((name) => ({ value: name, label: name })),
          },
          {
            key: "position",
            label: "Position",
            allLabel: "All positions",
            value: query.position,
            options: positions.map((name) => ({ value: name, label: name })),
          },
          {
            key: "employmentType",
            label: "Employment Type",
            allLabel: "All employment types",
            value: query.employmentType,
            options: EMPLOYMENT_TYPES.map((type) => ({ value: type.value, label: type.label })),
          },
          {
            key: "status",
            label: "Status",
            allLabel: "All statuses",
            value: query.status,
            options: EMPLOYEE_STATUSES.map((status) => ({
              value: status.value,
              label: status.label,
            })),
          },
        ]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_EMPLOYEE_SORT,
          options: EMPLOYEE_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
        }}
      >
        <ColumnMenu
          all={EMPLOYEE_COLUMNS}
          defaults={DEFAULT_EMPLOYEE_COLUMNS}
          columns={columns}
          onChange={setColumns}
        />
      </TableToolbar>

      {notice ? (
        <p
          role="alert"
          className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {notice}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto border-t border-black/8">
        <EmployeeTable employees={employees} columns={columns} />
      </div>
    </>
  )
}

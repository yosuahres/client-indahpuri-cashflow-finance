"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"

import type { Department } from "../actions"
import {
  DEFAULT_DEPARTMENT_COLUMNS,
  DEFAULT_DEPARTMENT_SORT,
  DEPARTMENT_COLUMNS,
  DEPARTMENT_COLUMNS_STORAGE_KEY,
  DEPARTMENT_SORTS,
} from "../columns"
import type { DepartmentQuery } from "../query"
import { DepartmentTable } from "./department-table"

/** The departments and the controls above them, as every list here is laid out. */
export function DepartmentList({
  departments,
  headcount,
  query,
  notice,
}: {
  departments: Department[]
  headcount: Record<string, number>
  query: DepartmentQuery
  /** Shown above the rows when the departments could not be read in full. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    DEPARTMENT_COLUMNS_STORAGE_KEY,
    DEFAULT_DEPARTMENT_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search departments"
        searchPlaceholder="Search by name"
        filters={[]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_DEPARTMENT_SORT,
          options: DEPARTMENT_SORTS.map((entry) => ({
            value: entry.value,
            label: entry.label,
          })),
        }}
      >
        <ColumnMenu
          all={DEPARTMENT_COLUMNS}
          defaults={DEFAULT_DEPARTMENT_COLUMNS}
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
        <DepartmentTable departments={departments} headcount={headcount} columns={columns} />
      </div>
    </>
  )
}

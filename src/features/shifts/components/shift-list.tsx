"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"

import type { Shift } from "../actions"
import {
  DEFAULT_SHIFT_COLUMNS,
  DEFAULT_SHIFT_SORT,
  SHIFT_COLUMNS,
  SHIFT_COLUMNS_STORAGE_KEY,
  SHIFT_SORTS,
} from "../columns"
import type { ShiftQuery } from "../query"
import { ShiftTable } from "./shift-table"

/** The shifts and the controls above them, as every list here is laid out. */
export function ShiftList({
  shifts,
  headcount,
  query,
  notice,
}: {
  shifts: Shift[]
  headcount: Record<string, number>
  query: ShiftQuery
  /** Shown above the rows when the shifts could not be read in full. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    SHIFT_COLUMNS_STORAGE_KEY,
    SHIFT_COLUMNS,
    DEFAULT_SHIFT_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search shifts"
        searchPlaceholder="Search by name"
        filters={[]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_SHIFT_SORT,
          options: SHIFT_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
        }}
      >
        <ColumnMenu
          all={SHIFT_COLUMNS}
          defaults={DEFAULT_SHIFT_COLUMNS}
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
        <ShiftTable shifts={shifts} headcount={headcount} columns={columns} />
      </div>
    </>
  )
}

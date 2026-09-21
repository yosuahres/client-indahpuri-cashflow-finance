"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"

import type { LeaveEntry } from "../actions"
import {
  DEFAULT_LEAVE_COLUMNS,
  DEFAULT_LEAVE_SORT,
  LEAVE_COLUMNS,
  LEAVE_COLUMNS_STORAGE_KEY,
  LEAVE_SORTS,
} from "../columns"
import { LEAVE_STATUSES, LEAVE_TYPES } from "../constants"
import type { LeaveQuery } from "../query"
import { LeaveTable } from "./leave-table"

/** The leave and the controls above it, as every list here is laid out. */
export function LeaveList({
  entries,
  status,
  query,
  notice,
}: {
  entries: LeaveEntry[]
  /** Narrowed in the database; empty shows every status. */
  status: string
  query: LeaveQuery
  /** Shown above the rows when the leave could not be read in full. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    LEAVE_COLUMNS_STORAGE_KEY,
    LEAVE_COLUMNS,
    DEFAULT_LEAVE_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search leave"
        searchPlaceholder="Search employee, type or reason"
        filters={[
          {
            key: "status",
            label: "Status",
            allLabel: "All statuses",
            value: status,
            options: LEAVE_STATUSES.map((entry) => ({
              value: entry.value,
              label: entry.label,
            })),
          },
          {
            key: "leaveType",
            label: "Type",
            allLabel: "All types",
            value: query.leaveType,
            options: LEAVE_TYPES.map((entry) => ({ value: entry.value, label: entry.label })),
          },
        ]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_LEAVE_SORT,
          options: LEAVE_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
        }}
      >
        <ColumnMenu
          all={LEAVE_COLUMNS}
          defaults={DEFAULT_LEAVE_COLUMNS}
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
        <LeaveTable entries={entries} columns={columns} />
      </div>
    </>
  )
}

"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"
import type { RosterEntry } from "@/features/employees/roster"

import type { AttendanceEntry } from "../actions"
import {
  ATTENDANCE_COLUMNS,
  ATTENDANCE_COLUMNS_STORAGE_KEY,
  ATTENDANCE_SORTS,
  DEFAULT_ATTENDANCE_COLUMNS,
  DEFAULT_ATTENDANCE_SORT,
} from "../columns"
import { ATTENDANCE_STATUSES } from "../constants"
import type { AttendanceQuery } from "../query"
import { AttendanceSheet } from "./attendance-sheet"

/** The day's roll and the controls above it, as every list here is laid out. */
export function AttendanceList({
  date,
  roster,
  entries,
  departments,
  query,
}: {
  date: string
  roster: RosterEntry[]
  entries: Record<string, AttendanceEntry>
  /** Every department someone on the roll is filed under. */
  departments: string[]
  query: AttendanceQuery
}) {
  const { columns, setColumns } = useTableColumns(
    ATTENDANCE_COLUMNS_STORAGE_KEY,
    ATTENDANCE_COLUMNS,
    DEFAULT_ATTENDANCE_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search the roll"
        searchPlaceholder="Search name, employee no. or department"
        filters={[
          {
            key: "department",
            label: "Department",
            allLabel: "All departments",
            value: query.department,
            options: departments.map((name) => ({ value: name, label: name })),
          },
          {
            key: "status",
            label: "Status",
            allLabel: "All statuses",
            value: query.status,
            options: [
              ...ATTENDANCE_STATUSES.map((entry) => ({
                value: entry.value,
                label: entry.label,
              })),
              { value: "none", label: "Not recorded" },
            ],
          },
        ]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_ATTENDANCE_SORT,
          options: ATTENDANCE_SORTS.map((entry) => ({
            value: entry.value,
            label: entry.label,
          })),
        }}
      >
        <ColumnMenu
          all={ATTENDANCE_COLUMNS}
          defaults={DEFAULT_ATTENDANCE_COLUMNS}
          columns={columns}
          onChange={setColumns}
        />
      </TableToolbar>

      <div className="min-h-0 flex-1 overflow-auto border-t border-black/8">
        <AttendanceSheet date={date} roster={roster} entries={entries} columns={columns} />
      </div>
    </>
  )
}

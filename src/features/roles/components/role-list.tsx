"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"
import type { RoleSummary } from "@/features/auth/roles"

import {
  DEFAULT_ROLE_COLUMNS,
  DEFAULT_ROLE_SORT,
  ROLE_COLUMNS,
  ROLE_COLUMNS_STORAGE_KEY,
  ROLE_KINDS,
  ROLE_SORTS,
} from "../columns"
import type { RoleQuery } from "../query"
import { RoleTable } from "./role-table"

/** The roles and the controls above them, laid out as every list here is. */
export function RoleList({
  roles,
  totalPermissions,
  editable,
  query,
  notice,
}: {
  roles: (RoleSummary & { members: number; permissions: number })[]
  totalPermissions: number
  editable: boolean
  query: RoleQuery
  /** Shown above the rows when the roles could not be read in full. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    ROLE_COLUMNS_STORAGE_KEY,
    ROLE_COLUMNS,
    DEFAULT_ROLE_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search roles"
        searchPlaceholder="Search name or description"
        filters={[
          {
            key: "kind",
            label: "Kind",
            allLabel: "Built in and added",
            value: query.kind,
            options: ROLE_KINDS,
          },
        ]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_ROLE_SORT,
          options: ROLE_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
        }}
      >
        <ColumnMenu
          all={ROLE_COLUMNS}
          defaults={DEFAULT_ROLE_COLUMNS}
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
        <RoleTable
          roles={roles}
          totalPermissions={totalPermissions}
          editable={editable}
          columns={columns}
        />
      </div>
    </>
  )
}

"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"
import type { RoleSummary } from "@/features/auth/roles"

import type { TeamMember } from "../actions"
import {
  DEFAULT_USER_COLUMNS,
  DEFAULT_USER_SORT,
  NO_ROLE,
  USER_COLUMNS,
  USER_COLUMNS_STORAGE_KEY,
  USER_SORTS,
} from "../columns"
import type { UserQuery } from "../query"
import { UserTable } from "./user-table"

/** The team and the controls above it, laid out as every list here is. */
export function UserList({
  members,
  roles,
  meId,
  query,
  notice,
}: {
  members: TeamMember[]
  roles: RoleSummary[]
  meId: string
  query: UserQuery
  /** Shown above the rows when the team could not be read in full. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    USER_COLUMNS_STORAGE_KEY,
    USER_COLUMNS,
    DEFAULT_USER_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search the team"
        searchPlaceholder="Search name or email"
        filters={[
          {
            key: "role",
            label: "Role",
            allLabel: "All roles",
            value: query.role,
            options: [
              ...roles.map((role) => ({ value: role.key, label: role.name })),
              { value: NO_ROLE, label: "Waiting for access" },
            ],
          },
        ]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_USER_SORT,
          options: USER_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
        }}
      >
        <ColumnMenu
          all={USER_COLUMNS}
          defaults={DEFAULT_USER_COLUMNS}
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
        <UserTable members={members} roles={roles} meId={meId} columns={columns} />
      </div>
    </>
  )
}

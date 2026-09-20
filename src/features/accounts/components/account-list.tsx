"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"

import type { Account } from "../actions"
import {
  ACCOUNT_COLUMNS,
  ACCOUNT_COLUMNS_STORAGE_KEY,
  ACCOUNT_OWNERSHIPS,
  ACCOUNT_SORTS,
  DEFAULT_ACCOUNT_COLUMNS,
  DEFAULT_ACCOUNT_SORT,
} from "../columns"
import { ACCOUNT_TYPES } from "../constants"
import type { AccountQuery } from "../query"
import { AccountTable } from "./account-table"

/** The accounts and the controls above them, laid out as every list here is. */
export function AccountList({
  accounts,
  query,
  notice,
}: {
  accounts: Account[]
  query: AccountQuery
  /** Shown above the rows when the accounts could not be read in full. */
  notice?: string
}) {
  const { columns, setColumns } = useTableColumns(
    ACCOUNT_COLUMNS_STORAGE_KEY,
    DEFAULT_ACCOUNT_COLUMNS,
  )

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search accounts"
        searchPlaceholder="Search name, bank, holder or number"
        filters={[
          {
            key: "type",
            label: "Type",
            allLabel: "All types",
            value: query.type,
            options: ACCOUNT_TYPES.map((type) => ({ value: type.value, label: type.label })),
          },
          {
            key: "ownership",
            label: "Ownership",
            allLabel: "Company and personal",
            value: query.ownership,
            options: ACCOUNT_OWNERSHIPS,
          },
        ]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_ACCOUNT_SORT,
          options: ACCOUNT_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
        }}
      >
        <ColumnMenu
          all={ACCOUNT_COLUMNS}
          defaults={DEFAULT_ACCOUNT_COLUMNS}
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
        <AccountTable accounts={accounts} columns={columns} />
      </div>
    </>
  )
}

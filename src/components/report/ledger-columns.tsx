"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { useTableColumns } from "@/components/table/use-table-columns"

import {
  DEFAULT_TRANSACTION_COLUMNS,
  TRANSACTION_COLUMNS,
  TRANSACTION_COLUMNS_STORAGE_KEY,
} from "./transaction-columns"
import { TransactionTable } from "./transaction-table"

/**
 * The ledger's Columns menu and the ledger itself sit either side of a
 * Suspense boundary — the toolbar is sent before the rows are ready. They are
 * two hooks over one stored value rather than one piece of shared state, so
 * the menu still drives the table: a write notifies every reader of the key.
 */
export function LedgerColumnMenu() {
  const { columns, setColumns } = useTableColumns(
    TRANSACTION_COLUMNS_STORAGE_KEY,
    TRANSACTION_COLUMNS,
    DEFAULT_TRANSACTION_COLUMNS,
  )

  return (
    <ColumnMenu
      all={TRANSACTION_COLUMNS}
      defaults={DEFAULT_TRANSACTION_COLUMNS}
      columns={columns}
      onChange={setColumns}
    />
  )
}

export function LedgerTable(props: Omit<React.ComponentProps<typeof TransactionTable>, "columns">) {
  const { columns } = useTableColumns(
    TRANSACTION_COLUMNS_STORAGE_KEY,
    TRANSACTION_COLUMNS,
    DEFAULT_TRANSACTION_COLUMNS,
  )

  return <TransactionTable {...props} columns={columns} />
}

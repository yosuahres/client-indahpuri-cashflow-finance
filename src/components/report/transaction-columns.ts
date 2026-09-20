import type { TableColumn } from "@/components/table/columns"

/**
 * The ledger's optional columns. The tick box and the date are not among them:
 * the date is sticky and carries the control that opens a row, so it stays.
 */
export type TransactionColumnKey =
  | "category"
  | "section"
  | "account"
  | "party"
  | "kind"
  | "status"
  | "reference"
  | "notes"
  | "createdAt"
  | "amount"

export const TRANSACTION_COLUMNS: TableColumn<TransactionColumnKey>[] = [
  { key: "category", label: "Category", width: "min-w-[200px]" },
  { key: "section", label: "Cash Flow Section", width: "min-w-[160px]" },
  { key: "account", label: "Account", width: "min-w-[200px]" },
  { key: "party", label: "Party", width: "min-w-[160px]" },
  { key: "kind", label: "Type", width: "min-w-[120px]" },
  { key: "status", label: "Status", width: "min-w-[100px]" },
  { key: "reference", label: "Reference No.", width: "min-w-[140px]" },
  { key: "notes", label: "Description", width: "min-w-[200px]" },
  { key: "createdAt", label: "Recorded", width: "min-w-[120px]" },
  { key: "amount", label: "Amount" },
]

/** What the ledger opens on; the rest are offered through the Columns menu. */
export const DEFAULT_TRANSACTION_COLUMNS: TransactionColumnKey[] = [
  "category",
  "account",
  "party",
  "kind",
  "status",
  "amount",
]

/** Where the chosen columns and their order are remembered, per browser. */
export const TRANSACTION_COLUMNS_STORAGE_KEY = "finance.transactions.columns"

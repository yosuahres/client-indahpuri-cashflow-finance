import type { TableColumn } from "@/components/table/columns"

/**
 * The account table's optional columns. Name is not among them: it is the
 * first column and names the row, so it always shows — and nor are the row
 * actions, which stay pinned to the end.
 */
export type AccountColumnKey =
  | "type"
  | "issuer"
  | "provider"
  | "holder"
  | "accountNo"
  | "ownership"
  | "notes"
  | "createdAt"

export const ACCOUNT_COLUMNS: TableColumn<AccountColumnKey>[] = [
  { key: "type", label: "Type", width: "min-w-[110px]" },
  { key: "issuer", label: "Bank / Provider / Holder", width: "min-w-[160px]" },
  { key: "provider", label: "Provider", width: "min-w-[140px]" },
  { key: "holder", label: "Held By", width: "min-w-[140px]" },
  { key: "accountNo", label: "Account No.", width: "min-w-[140px]" },
  { key: "ownership", label: "Ownership", width: "min-w-[100px]" },
  { key: "notes", label: "Description", width: "min-w-[200px]" },
  { key: "createdAt", label: "Added", width: "min-w-[120px]" },
]

/** What the list opens on; the rest are offered through the Columns menu. */
export const DEFAULT_ACCOUNT_COLUMNS: AccountColumnKey[] = [
  "type",
  "issuer",
  "accountNo",
  "ownership",
]

/** Where the chosen columns and their order are remembered, per browser. */
export const ACCOUNT_COLUMNS_STORAGE_KEY = "finance.accounts.columns"

export const ACCOUNT_SORTS: { value: AccountSortValue; label: string }[] = [
  { value: "name", label: "Name" },
  ...ACCOUNT_COLUMNS.map((column) => ({
    value: column.key as AccountSortValue,
    label: column.label,
  })),
]

export type AccountSortValue = "name" | AccountColumnKey

export const DEFAULT_ACCOUNT_SORT: AccountSortValue = "name"

/** Who the money belongs to, as the list filters on it. */
export const ACCOUNT_OWNERSHIPS = [
  { value: "company", label: "Company" },
  { value: "personal", label: "Personal" },
]

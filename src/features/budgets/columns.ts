import type { TableColumn } from "@/components/table/columns"

/**
 * The Anggaran sheet's pickable columns. Amount is not among them — it is the
 * figure the sheet exists to show and edit — and neither is Per Month, which
 * belongs to the yearly-plan blocks that levelled it.
 */
export type BudgetColumnKey =
  | "period"
  | "account"
  | "section"
  | "category"
  | "name"
  | "costCenter"
  | "warnOnOverrun"
  | "createdAt"

export const BUDGET_COLUMNS: TableColumn<BudgetColumnKey>[] = [
  { key: "period", label: "Period", width: "min-w-[120px]" },
  { key: "account", label: "Account", width: "min-w-[160px]" },
  { key: "section", label: "Section", width: "min-w-[120px]" },
  { key: "category", label: "Category", width: "min-w-[180px]" },
  { key: "name", label: "Plan Name", width: "min-w-[180px]" },
  { key: "costCenter", label: "Cost Centre", width: "min-w-[160px]" },
  { key: "warnOnOverrun", label: "Warn On Overrun", width: "min-w-[140px]" },
  { key: "createdAt", label: "Added", width: "min-w-[120px]" },
]

/** What the sheet opens on; the rest are offered through the Columns menu. */
export const DEFAULT_BUDGET_COLUMNS: BudgetColumnKey[] = [
  "period",
  "account",
  "section",
  "category",
]

/** Where the chosen columns and their order are remembered, per browser. */
export const BUDGET_COLUMNS_STORAGE_KEY = "finance.budgets.columns"

export type BudgetSortValue = BudgetColumnKey | "amount"

export const BUDGET_SORTS: { value: BudgetSortValue; label: string }[] = [
  ...BUDGET_COLUMNS.map((column) => ({
    value: column.key as BudgetSortValue,
    label: column.label,
  })),
  { value: "amount", label: "Amount" },
]

export const DEFAULT_BUDGET_SORT: BudgetSortValue = "category"

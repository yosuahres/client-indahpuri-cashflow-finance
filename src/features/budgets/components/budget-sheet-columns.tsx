"use client"

import { useTableColumns } from "@/components/table/use-table-columns"

import { BUDGET_COLUMNS_STORAGE_KEY, DEFAULT_BUDGET_COLUMNS } from "../columns"
import { BudgetSheet } from "./budget-table"

/**
 * The sheet, reading the columns the toolbar's menu writes. The two sit either
 * side of a Suspense boundary, so they are two hooks over one stored value
 * rather than one piece of shared state.
 */
export function BudgetSheetColumns(
  props: Omit<React.ComponentProps<typeof BudgetSheet>, "columns">,
) {
  const { columns } = useTableColumns(BUDGET_COLUMNS_STORAGE_KEY, DEFAULT_BUDGET_COLUMNS)
  return <BudgetSheet {...props} columns={columns} />
}

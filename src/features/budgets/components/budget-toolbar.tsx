"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar, type ToolbarField } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"
import type { Account } from "@/features/accounts/actions"
import { BUDGET_PERIODS, TRANSACTION_KINDS } from "@/lib/finance"

import {
  BUDGET_COLUMNS,
  BUDGET_COLUMNS_STORAGE_KEY,
  BUDGET_SORTS,
  DEFAULT_BUDGET_COLUMNS,
  DEFAULT_BUDGET_SORT,
} from "../columns"
import { MONTH_OPTIONS, yearOptions, type BudgetPeriodSelection } from "../period"
import type { BudgetQuery } from "../query"

/**
 * The period the Anggaran list is scoped to, and what it is narrowed to inside
 * that period — all of it behind the Filters panel every table here uses.
 */
export function BudgetToolbar({
  selection,
  thisYear,
  accounts,
  account,
  query,
}: {
  selection: BudgetPeriodSelection
  /** Centres the year list on the year being lived in, not the one on screen. */
  thisYear: number
  accounts: Account[]
  /** Empty shows every account's plans side by side. */
  account: string
  query: BudgetQuery
}) {
  const { columns, setColumns } = useTableColumns(
    BUDGET_COLUMNS_STORAGE_KEY,
    DEFAULT_BUDGET_COLUMNS,
  )

  const fields: ToolbarField[] = [
    {
      key: "period",
      label: "Period Type",
      value: selection.period,
      defaultValue: "monthly",
      options: BUDGET_PERIODS.map((option) => ({ value: option.value, label: option.label })),
    },
    // A month only scopes anything while the view is monthly.
    ...(selection.period === "monthly"
      ? ([
          {
            key: "month",
            label: "Month",
            value: String(selection.month),
            defaultValue: String(selection.month),
            options: MONTH_OPTIONS,
          },
        ] satisfies ToolbarField[])
      : []),
    {
      key: "year",
      label: "Year",
      value: String(selection.year),
      defaultValue: String(thisYear),
      options: yearOptions(thisYear, { back: 5, ahead: 5 }),
    },
    {
      key: "account",
      label: "Account",
      allLabel: "All accounts",
      value: account,
      options: accounts.map((entry) => ({ value: entry.name, label: entry.name })),
    },
    {
      key: "kind",
      label: "Direction",
      allLabel: "Income and expense",
      value: query.kind,
      options: TRANSACTION_KINDS.map((entry) => ({ value: entry.value, label: entry.short })),
    },
  ]

  return (
    <TableToolbar
      filters={fields}
      search={query.q}
      searchLabel="Search budgets"
      searchPlaceholder="Search any field on the plan"
      sort={{
        value: query.sort,
        direction: query.direction,
        defaultValue: DEFAULT_BUDGET_SORT,
        options: BUDGET_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
      }}
    >
      <ColumnMenu
        all={BUDGET_COLUMNS}
        defaults={DEFAULT_BUDGET_COLUMNS}
        columns={columns}
        onChange={setColumns}
      />
    </TableToolbar>
  )
}

"use client"

import type { ReactNode } from "react"

import { TableToolbar, type ToolbarField } from "@/components/table/table-toolbar"
import { PERIODICITIES } from "@/features/reports/periods"
import type { SettlementFilter } from "@/features/reports/range"

const YEAR_SPAN = 5

/**
 * The report's period and scope, behind the same Filters panel every table
 * here uses. The controls used to sit in a row of their own above the figures;
 * seven dropdowns is a wall, and only ever one or two of them get changed.
 */
export function ReportToolbar({
  company,
  mode,
  fromYear,
  toYear,
  from,
  to,
  periodicity,
  kind,
  incomeStatus,
  expenseStatus,
  today,
  search,
  children,
}: {
  company: string
  mode: "fiscal" | "range"
  fromYear: number
  toYear: number
  from: string
  to: string
  periodicity: string
  /**
   * Direction the ledger is narrowed to. Omitted on views that have no rows to
   * narrow — the dashboard plots income against expense, so filtering one out
   * would leave its net figure meaningless.
   */
  kind?: "all" | "income" | "expense"
  incomeStatus?: SettlementFilter
  expenseStatus?: SettlementFilter
  today: string
  /** The term in the URL. Omitted on views with no rows to search. */
  search?: string
  /** Extra toolbar controls — the Columns menu, where there is a table. */
  children?: ReactNode
}) {
  const thisYear = today.slice(0, 4)
  const years = Array.from({ length: YEAR_SPAN * 2 + 1 }, (_, index) =>
    String(Number(thisYear) - YEAR_SPAN + index),
  ).map((year) => ({ value: year, label: year }))

  const fields: ToolbarField[] = [
    {
      key: "company",
      label: "Company",
      kind: "text",
      value: company,
      defaultValue: "indahpuri",
      placeholder: "Name on the report",
    },
    {
      key: "mode",
      label: "Period",
      value: mode,
      defaultValue: "fiscal",
      options: [
        { value: "fiscal", label: "Fiscal Year" },
        { value: "range", label: "Date Range" },
      ],
    },
    // The two fields under the mode follow whichever mode is chosen.
    ...(mode === "fiscal"
      ? ([
          {
            key: "fromYear",
            label: "From Year",
            value: String(fromYear),
            defaultValue: thisYear,
            options: years,
          },
          {
            key: "toYear",
            label: "To Year",
            value: String(toYear),
            defaultValue: thisYear,
            options: years,
          },
        ] satisfies ToolbarField[])
      : ([
          { key: "from", label: "From", kind: "date", value: from, today },
          { key: "to", label: "To", kind: "date", value: to, today },
        ] satisfies ToolbarField[])),
    {
      key: "periodicity",
      label: "Columns",
      value: periodicity,
      defaultValue: "Quarterly",
      options: PERIODICITIES.map((option) => ({ value: option, label: option })),
    },
    ...(kind
      ? ([
          {
            key: "kind",
            label: "Direction",
            value: kind,
            defaultValue: "all",
            options: [
              { value: "all", label: "Income & Expense" },
              { value: "income", label: "Income only" },
              { value: "expense", label: "Expense only" },
            ],
          },
        ] satisfies ToolbarField[])
      : []),
    ...(incomeStatus
      ? ([
          {
            key: "incomeStatus",
            label: "Income Status",
            value: incomeStatus,
            defaultValue: "all",
            options: [
              { value: "all", label: "All income" },
              { value: "paid", label: "Setor" },
              { value: "unpaid", label: "Belum setor" },
            ],
          },
        ] satisfies ToolbarField[])
      : []),
    ...(expenseStatus
      ? ([
          {
            key: "expenseStatus",
            label: "Expense Status",
            value: expenseStatus,
            defaultValue: "all",
            options: [
              { value: "all", label: "All expenses" },
              { value: "paid", label: "Paid" },
              { value: "unpaid", label: "Unpaid" },
            ],
          },
        ] satisfies ToolbarField[])
      : []),
  ]

  return (
    <TableToolbar
      filters={fields}
      search={search}
      searchLabel="Search transactions"
      searchPlaceholder="Search any field on the entry"
    >
      {children}
    </TableToolbar>
  )
}

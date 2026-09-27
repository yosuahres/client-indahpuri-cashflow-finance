"use client"

import { ColumnMenu } from "@/components/table/column-menu"
import { TableToolbar } from "@/components/table/table-toolbar"
import { useTableColumns } from "@/components/table/use-table-columns"

import type { PayrollRates } from "../calculate"
import {
  DEFAULT_PAYROLL_COLUMNS,
  DEFAULT_PAYROLL_SORT,
  PAY_TYPES,
  PAYROLL_COLUMNS,
  PAYROLL_COLUMNS_STORAGE_KEY,
  PAYROLL_SORTS,
} from "../columns"
import type { PayrollEmployee, PayrollRun, Payslip } from "../data"
import type { PayrollQuery } from "../query"
import { PayrollSheet } from "./payroll-sheet"

/** The month's sheet and the controls above it, as every list here is laid out. */
export function PayrollList({
  period,
  run,
  employees,
  workingDays,
  payslips,
  rates,
  departments,
  query,
}: {
  period: string
  run: PayrollRun | null
  /** The rows on show, already narrowed and ordered. */
  employees: PayrollEmployee[]
  workingDays: Record<string, number>
  payslips: Record<string, Payslip>
  rates: PayrollRates
  /** Every department someone on the sheet is filed under. */
  departments: string[]
  query: PayrollQuery
}) {
  const { columns, setColumns } = useTableColumns(
    PAYROLL_COLUMNS_STORAGE_KEY,
    PAYROLL_COLUMNS,
    DEFAULT_PAYROLL_COLUMNS,
  )
  const filtered = Boolean(query.q || query.department || query.payType)

  return (
    <>
      <TableToolbar
        search={query.q}
        searchLabel="Search the payroll"
        searchPlaceholder="Search name, employee no. or department"
        filters={[
          {
            key: "department",
            label: "Department",
            allLabel: "All departments",
            value: query.department,
            options: departments.map((name) => ({ value: name, label: name })),
          },
          {
            key: "payType",
            label: "Pay type",
            allLabel: "Everyone",
            value: query.payType,
            options: PAY_TYPES.map((type) => ({ value: type.value, label: type.label })),
          },
        ]}
        sort={{
          value: query.sort,
          direction: query.direction,
          defaultValue: DEFAULT_PAYROLL_SORT,
          options: PAYROLL_SORTS.map((entry) => ({ value: entry.value, label: entry.label })),
        }}
      >
        <ColumnMenu
          all={PAYROLL_COLUMNS}
          defaults={DEFAULT_PAYROLL_COLUMNS}
          columns={columns}
          onChange={setColumns}
        />
      </TableToolbar>

      <div className="min-h-0 flex-1 overflow-auto border-t border-black/8">
        <PayrollSheet
          // A new month, or a run changing hands between draft and final,
          // starts from what is on file for it.
          key={`${period}-${run?.id ?? "new"}-${run?.status ?? "none"}`}
          period={period}
          run={run}
          employees={employees}
          workingDays={workingDays}
          payslips={payslips}
          rates={rates}
          columns={columns}
          filtered={filtered}
        />
      </div>
    </>
  )
}

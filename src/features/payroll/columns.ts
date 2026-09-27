import type { TableColumn } from "@/components/table/columns"

/**
 * The payroll sheet's optional columns. The employee names the row and net pay
 * is what the sheet is for, so both always show.
 */
export type PayrollColumnKey =
  | "department"
  | "workingDays"
  | "basicSalary"
  | "fixedAllowance"
  | "mealAllowance"
  | "thr"
  | "serviceCharge"
  | "otherAllowance"
  | "bonus"
  | "grossPay"
  | "bpjsTk"
  | "bpjsKes"
  | "otherDeduction"

export const PAYROLL_COLUMNS: TableColumn<PayrollColumnKey>[] = [
  { key: "department", label: "Department", width: "min-w-[140px]" },
  { key: "workingDays", label: "Days" },
  { key: "basicSalary", label: "Basic" },
  { key: "fixedAllowance", label: "Fixed Allow." },
  { key: "mealAllowance", label: "Meal" },
  { key: "thr", label: "THR" },
  { key: "serviceCharge", label: "Service Charge" },
  { key: "otherAllowance", label: "Other Allow." },
  { key: "bonus", label: "Bonus" },
  { key: "grossPay", label: "Gross" },
  { key: "bpjsTk", label: "BPJS TK" },
  { key: "bpjsKes", label: "BPJS Kes" },
  { key: "otherDeduction", label: "Other Ded." },
]

/** The department rides under the name by default, so it is not a column too. */
export const DEFAULT_PAYROLL_COLUMNS: PayrollColumnKey[] = PAYROLL_COLUMNS.map(
  (column) => column.key,
).filter((key) => key !== "department")

/** Where the chosen columns and their order are remembered, per browser. */
export const PAYROLL_COLUMNS_STORAGE_KEY = "hris.payroll.columns"

export type PayrollSortValue = "name" | "employeeNo" | "department" | "workingDays" | "grossPay" | "netPay"

export const PAYROLL_SORTS: { value: PayrollSortValue; label: string }[] = [
  { value: "name", label: "Employee" },
  { value: "employeeNo", label: "Employee ID" },
  { value: "department", label: "Department" },
  { value: "workingDays", label: "Days worked" },
  { value: "grossPay", label: "Gross pay" },
  { value: "netPay", label: "Net pay" },
]

export const DEFAULT_PAYROLL_SORT: PayrollSortValue = "name"

export const PAY_TYPES = [
  { value: "monthly", label: "Monthly staff" },
  { value: "daily", label: "Daily workers" },
] as const

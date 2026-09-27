import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import { calculatePay, NO_INPUTS, type PayFigures, type PayrollRates } from "./calculate"
import { DEFAULT_PAYROLL_SORT, PAY_TYPES, PAYROLL_SORTS, type PayrollSortValue } from "./columns"
import type { PayrollEmployee, Payslip } from "./data"

/** What the payroll sheet is narrowed and ordered by. */
export type PayrollQuery = {
  /** Matches a name, an employee number or a department. */
  q: string
  department: string
  /** "monthly" or "daily". */
  payType: string
  sort: string
  direction: string
}

export function readPayrollQuery(
  params: Record<string, string | string[] | undefined>,
  departments: string[],
): PayrollQuery {
  return {
    q: param(params.q).trim(),
    department: oneOf(params.department, departments),
    payType: oneOf(params.payType, PAY_TYPES.map((type) => type.value)),
    sort: oneOf(
      params.sort,
      PAYROLL_SORTS.map((entry) => entry.value),
      DEFAULT_PAYROLL_SORT,
    ),
    direction: direction(params.direction),
  }
}

/**
 * The people a query asks for, narrowed and then ordered. Only the rows on
 * show are submitted, and the save touches nobody it was not sent — so
 * narrowing the sheet never disturbs the people left off it.
 *
 * Pay is sorted on the figure the sheet shows: what was saved once final, and
 * what the record comes to now while a draft (the typed-in amounts as saved).
 */
export function applyPayrollQuery(
  employees: PayrollEmployee[],
  query: PayrollQuery,
  context: {
    locked: boolean
    payslips: Record<string, Payslip>
    workingDays: Record<string, number>
    rates: PayrollRates
  },
) {
  const figuresOf = (employee: PayrollEmployee): PayFigures =>
    context.locked && context.payslips[employee.id]
      ? context.payslips[employee.id]
      : calculatePay(
          { ...employee, workingDays: context.workingDays[employee.id] ?? 0 },
          context.payslips[employee.id] ?? NO_INPUTS,
          context.rates,
        )

  const term = query.q.toLowerCase()
  const matching = employees.filter((employee) => {
    if (context.locked && !context.payslips[employee.id]) return false
    if (query.department && employee.department !== query.department) return false
    const daily = employee.employmentType === "daily_worker"
    if (query.payType === "daily" && !daily) return false
    if (query.payType === "monthly" && daily) return false
    return matchesTerm(term, [employee.fullName, employee.employeeNo, employee.department])
  })

  const descending = query.direction === "desc"
  const number = (value: number) => String(value).padStart(16, "0")
  const key = (employee: PayrollEmployee) => {
    switch (query.sort as PayrollSortValue) {
      case "employeeNo":
        return employee.employeeNo
      case "department":
        return employee.department ?? ""
      case "workingDays":
        return number(figuresOf(employee).workingDays)
      case "grossPay":
        return number(figuresOf(employee).grossPay)
      case "netPay":
        return number(Math.max(0, figuresOf(employee).netPay))
      default:
        return employee.fullName
    }
  }

  return [...matching].sort((a, b) => {
    const order = compareKeys(key(a), key(b), descending)
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.fullName.localeCompare(b.fullName)
  })
}

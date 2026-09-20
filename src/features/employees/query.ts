import { compareKeys, matchesTerm, oneOf, param, direction } from "@/components/table/query"

import type { Employee } from "./actions"
import { DEFAULT_EMPLOYEE_SORT, EMPLOYEE_SORTS } from "./columns"
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "./constants"

/** Every filter and ordering the roll understands, as it arrives from the URL. */
export type EmployeeQuery = {
  /** Matches a name, an employee number or a position. */
  q: string
  department: string
  position: string
  employmentType: string
  status: string
  sort: string
  direction: string
}

/**
 * What an ordering compares. Every field is sortable, so this reads the record
 * rather than naming each one; an empty string means "not on file".
 */
function sortKey(employee: Employee, sort: string) {
  if (sort === "fullName") return employee.fullName
  if (sort === "createdAt") return employee.createdAt
  return employee.fields[sort] ?? ""
}

export function readEmployeeQuery(
  params: Record<string, string | string[] | undefined>,
  { departments, positions }: { departments: string[]; positions: string[] },
): EmployeeQuery {
  // A department or position nobody holds any more falls back to everyone.
  return {
    q: param(params.q).trim(),
    department: oneOf(params.department, departments),
    position: oneOf(params.position, positions),
    employmentType: oneOf(
      params.employmentType,
      EMPLOYMENT_TYPES.map((type) => type.value),
    ),
    status: oneOf(
      params.status,
      EMPLOYEE_STATUSES.map((status) => status.value),
    ),
    sort: oneOf(
      params.sort,
      EMPLOYEE_SORTS.map((entry) => entry.value),
      DEFAULT_EMPLOYEE_SORT,
    ),
    direction: direction(params.direction),
  }
}

/** The rows a query asks for, narrowed and then ordered. */
export function applyEmployeeQuery(employees: Employee[], query: EmployeeQuery) {
  const term = query.q.toLowerCase()
  const matching = employees.filter((employee) => {
    if (query.department && employee.department !== query.department) return false
    if (query.position && employee.position !== query.position) return false
    if (query.employmentType && employee.employmentType !== query.employmentType) return false
    if (query.status && employee.status !== query.status) return false
    // Every field is searched, not just the ones on show.
    return matchesTerm(term, [employee.fullName, ...Object.values(employee.fields)])
  })

  const descending = query.direction === "desc"
  return [...matching].sort((a, b) => {
    const order = compareKeys(sortKey(a, query.sort), sortKey(b, query.sort), descending)
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.fullName.localeCompare(b.fullName)
  })
}

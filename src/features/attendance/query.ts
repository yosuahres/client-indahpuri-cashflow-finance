import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import type { RosterEntry } from "@/features/employees/roster"

import type { AttendanceEntry } from "./actions"
import {
  ATTENDANCE_SORTS,
  DEFAULT_ATTENDANCE_SORT,
  type AttendanceSortValue,
} from "./columns"
import { ATTENDANCE_STATUSES, attendanceStatusLabel } from "./constants"

/** What the day's sheet is narrowed and ordered by. */
export type AttendanceQuery = {
  /** Matches a name, an employee number or a department. */
  q: string
  department: string
  status: string
  sort: string
  direction: string
}

export function readAttendanceQuery(
  params: Record<string, string | string[] | undefined>,
  departments: string[],
): AttendanceQuery {
  return {
    q: param(params.q).trim(),
    department: oneOf(params.department, departments),
    status: oneOf(
      params.status,
      // "none" stands for anyone with nothing recorded yet.
      [...ATTENDANCE_STATUSES.map((entry) => entry.value), "none"],
    ),
    sort: oneOf(
      params.sort,
      ATTENDANCE_SORTS.map((entry) => entry.value),
      DEFAULT_ATTENDANCE_SORT,
    ),
    direction: direction(params.direction),
  }
}

/**
 * The roll a query asks for, narrowed and then ordered. Only the rows on show
 * are submitted, and the save touches nobody it was not sent — so narrowing
 * the sheet never disturbs the people left off it.
 */
export function applyAttendanceQuery(
  roster: RosterEntry[],
  query: AttendanceQuery,
  entries: Record<string, AttendanceEntry>,
) {
  const statusOf = (employee: RosterEntry) => entries[employee.id]?.status ?? ""

  const term = query.q.toLowerCase()
  const matching = roster.filter((employee) => {
    if (query.department && employee.department !== query.department) return false
    if (query.status === "none" && statusOf(employee)) return false
    if (query.status && query.status !== "none" && statusOf(employee) !== query.status) return false
    return matchesTerm(term, [employee.fullName, employee.employeeNo, employee.department])
  })

  const descending = query.direction === "desc"
  const key = (employee: RosterEntry) => {
    switch (query.sort as AttendanceSortValue) {
      case "employeeNo":
        return employee.employeeNo
      case "department":
        return employee.department ?? ""
      case "status": {
        const status = statusOf(employee)
        return status ? attendanceStatusLabel(status) : ""
      }
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

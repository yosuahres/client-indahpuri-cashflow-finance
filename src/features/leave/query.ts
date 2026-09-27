import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import type { LeaveEntry } from "./actions"
import { DEFAULT_LEAVE_DIRECTION, DEFAULT_LEAVE_SORT, LEAVE_SORTS, type LeaveSortValue } from "./columns"
import { leaveDays, leaveStatusLabel } from "./constants"

/** What the leave list is narrowed and ordered by, beyond its status. */
export type LeaveQuery = {
  /** Matches an employee, a leave type or the reason given. */
  q: string
  /** A leave type's id; empty shows every type. */
  leaveType: string
  /** `YYYY-MM-DD`: only who is off that day. Narrowed in the database. */
  on: string
  sort: string
  direction: string
}

export function readLeaveQuery(
  params: Record<string, string | string[] | undefined>,
): LeaveQuery {
  return {
    q: param(params.q).trim(),
    leaveType: param(params.leaveType),
    on: /^\d{4}-\d{2}-\d{2}$/.test(param(params.on)) ? param(params.on) : "",
    sort: oneOf(
      params.sort,
      LEAVE_SORTS.map((entry) => entry.value),
      DEFAULT_LEAVE_SORT,
    ),
    direction: direction(params.direction, DEFAULT_LEAVE_DIRECTION),
  }
}

/** The spells a query asks for, narrowed and then ordered. */
export function applyLeaveQuery(entries: LeaveEntry[], query: LeaveQuery) {
  const term = query.q.toLowerCase()
  const matching = entries.filter((entry) => {
    if (query.leaveType && entry.leaveTypeId !== query.leaveType) return false
    // Every field is searched, not just the ones on show.
    return matchesTerm(term, [
      entry.employeeName,
      entry.employeeNo,
      entry.leaveTypeName,
      leaveStatusLabel(entry.status),
      entry.reason,
    ])
  })

  const descending = query.direction === "desc"
  const sign = descending ? -1 : 1

  function text(entry: LeaveEntry) {
    switch (query.sort as LeaveSortValue) {
      case "employee":
        return entry.employeeName
      case "leaveType":
        return entry.leaveTypeName
      case "status":
        return leaveStatusLabel(entry.status)
      case "reason":
        return entry.reason ?? ""
      case "endDate":
        return entry.endDate
      case "createdAt":
        return entry.createdAt
      default:
        return entry.startDate
    }
  }

  return [...matching].sort((a, b) => {
    const sort = query.sort as LeaveSortValue
    const order =
      sort === "length"
        ? sign *
          (leaveDays(a.startDate, a.endDate) - leaveDays(b.startDate, b.endDate))
        : compareKeys(text(a), text(b), descending)
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.employeeName.localeCompare(b.employeeName)
  })
}

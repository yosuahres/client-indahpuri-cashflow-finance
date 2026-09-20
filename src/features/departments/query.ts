import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import type { Department } from "./actions"
import {
  DEFAULT_DEPARTMENT_SORT,
  DEPARTMENT_SORTS,
  type DepartmentSortValue,
} from "./columns"

/** What the departments list is narrowed and ordered by. */
export type DepartmentQuery = {
  /** Matches a department's name. */
  q: string
  sort: string
  direction: string
}

export function readDepartmentQuery(
  params: Record<string, string | string[] | undefined>,
): DepartmentQuery {
  return {
    q: param(params.q).trim(),
    sort: oneOf(
      params.sort,
      DEPARTMENT_SORTS.map((entry) => entry.value),
      DEFAULT_DEPARTMENT_SORT,
    ),
    direction: direction(params.direction),
  }
}

/** The departments a query asks for, narrowed and then ordered. */
export function applyDepartmentQuery(
  departments: Department[],
  query: DepartmentQuery,
  headcount: Record<string, number>,
) {
  const term = query.q.toLowerCase()
  const matching = departments.filter((department) => matchesTerm(term, [department.name]))

  const descending = query.direction === "desc"
  return [...matching].sort((a, b) => {
    const order =
      query.sort === "headcount"
        ? // Headcount orders as a number, not as text.
          (descending ? -1 : 1) * ((headcount[a.name] ?? 0) - (headcount[b.name] ?? 0))
        : compareKeys(
            query.sort === "createdAt" ? a.createdAt : a.name,
            query.sort === "createdAt" ? b.createdAt : b.name,
            descending,
          )
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.name.localeCompare(b.name)
  })
}

export type { DepartmentSortValue }

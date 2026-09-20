import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import type { RoleSummary } from "@/features/auth/roles"

import {
  DEFAULT_ROLE_SORT,
  ROLE_KINDS,
  ROLE_SORTS,
  type RoleSortValue,
} from "./columns"

type RoleRow = RoleSummary & { members: number; permissions: number }

/** Every filter and ordering the roles list understands. */
export type RoleQuery = {
  /** Matches a role's name or its description. */
  q: string
  kind: string
  sort: string
  direction: string
}

export function readRoleQuery(
  params: Record<string, string | string[] | undefined>,
): RoleQuery {
  return {
    q: param(params.q).trim(),
    kind: oneOf(
      params.kind,
      ROLE_KINDS.map((entry) => entry.value),
    ),
    sort: oneOf(
      params.sort,
      ROLE_SORTS.map((entry) => entry.value),
      DEFAULT_ROLE_SORT,
    ),
    direction: direction(params.direction),
  }
}

/** The roles a query asks for, narrowed and then ordered. */
export function applyRoleQuery<Row extends RoleRow>(roles: Row[], query: RoleQuery) {
  const term = query.q.toLowerCase()
  const matching = roles.filter((role) => {
    if (query.kind === "built_in" && !role.builtIn) return false
    if (query.kind === "custom" && role.builtIn) return false
    return matchesTerm(term, [role.name, role.description])
  })

  // The two counts order as numbers; the name orders as text.
  const descending = query.direction === "desc"
  const numeric = (value: number) => (descending ? -value : value)
  return [...matching].sort((a, b) => {
    const text = (role: Row) =>
      query.sort === "key"
        ? role.key
        : query.sort === "description"
          ? (role.description ?? "")
          : query.sort === "builtIn"
            ? role.builtIn
              ? "Yes"
              : "No"
            : role.name
    const order =
      query.sort === "members"
        ? numeric(a.members - b.members)
        : query.sort === "permissions"
          ? numeric(a.permissions - b.permissions)
          : compareKeys(text(a), text(b), descending)
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.name.localeCompare(b.name)
  })
}

export type { RoleSortValue }

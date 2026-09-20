import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import type { RoleSummary } from "@/features/auth/roles"

import type { TeamMember } from "./actions"
import {
  DEFAULT_USER_SORT,
  NO_ROLE,
  USER_SORTS,
  type UserSortValue,
} from "./columns"

/** Every filter and ordering the team list understands. */
export type UserQuery = {
  /** Matches a name or an email address. */
  q: string
  /** A role key, or `NO_ROLE` for anyone still waiting. */
  role: string
  sort: string
  direction: string
}

export function readUserQuery(
  params: Record<string, string | string[] | undefined>,
  roles: RoleSummary[],
): UserQuery {
  return {
    q: param(params.q).trim(),
    role: oneOf(params.role, [...roles.map((role) => role.key), NO_ROLE]),
    sort: oneOf(
      params.sort,
      USER_SORTS.map((entry) => entry.value),
      DEFAULT_USER_SORT,
    ),
    direction: direction(params.direction),
  }
}

/** The members a query asks for, narrowed and then ordered. */
export function applyUserQuery(
  members: TeamMember[],
  query: UserQuery,
  roles: RoleSummary[],
) {
  const roleName = (key: string | null) =>
    key ? (roles.find((role) => role.key === key)?.name ?? key) : ""

  const term = query.q.toLowerCase()
  const matching = members.filter((member) => {
    if (query.role === NO_ROLE && member.role !== null) return false
    if (query.role && query.role !== NO_ROLE && member.role !== query.role) return false
    return matchesTerm(term, [member.name, member.email])
  })

  const keys: Record<UserSortValue, (member: TeamMember) => string> = {
    user: (member) => member.name || member.email,
    email: (member) => member.email,
    role: (member) => roleName(member.role),
    joined: (member) => member.joinedAt,
  }

  const key = keys[query.sort as UserSortValue]
  const descending = query.direction === "desc"
  return [...matching].sort((a, b) => {
    const order = compareKeys(key(a), key(b), descending)
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : (a.name || a.email).localeCompare(b.name || b.email)
  })
}

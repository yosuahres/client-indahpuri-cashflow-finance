import { oneOf, param } from "@/components/table/query"

import { AUDIT_ACTIONS, AUDIT_RESOURCES } from "./constants"

/**
 * Every filter the audit log understands. The log only grows, so unlike the
 * other lists it is narrowed in the database rather than after reading it all.
 */
export type AuditQuery = {
  /** Matches an email, an event, a record ID or an IP address. */
  q: string
  resource: string
  action: string
  role: string
  /** Part of the user's email address. */
  user: string
  /** `YYYY-MM-DD`, Jakarta time, both ends included. */
  from: string
  to: string
  /** 1-based. */
  page: number
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

function date(value: string | string[] | undefined) {
  const choice = param(value)
  return DATE.test(choice) && !Number.isNaN(Date.parse(choice)) ? choice : ""
}

export function readAuditQuery(
  params: Record<string, string | string[] | undefined>,
  roleKeys: readonly string[],
): AuditQuery {
  const page = Number.parseInt(param(params.page), 10)
  return {
    q: param(params.q).trim(),
    resource: oneOf(
      params.resource,
      AUDIT_RESOURCES.map((entry) => entry.value),
    ),
    action: oneOf(
      params.action,
      AUDIT_ACTIONS.map((entry) => entry.value),
    ),
    role: oneOf(params.role, roleKeys),
    user: param(params.user).trim(),
    from: date(params.from),
    to: date(params.to),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  }
}

/** The query as URL parameters, page left out — what the export link carries. */
export function auditSearchParams(query: AuditQuery) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (key !== "page" && typeof value === "string" && value) params.set(key, value)
  }
  return params
}

import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import { sectionLabel, TRANSACTION_KINDS } from "@/lib/finance"

import { BUDGET_SORTS, DEFAULT_BUDGET_SORT, type BudgetSortValue } from "./columns"
import type { BudgetEntry } from "./list"

/** What the Anggaran list is narrowed and ordered by, beyond its period. */
export type BudgetQuery = {
  /** Matches a plan's category, cost centre, account or name. */
  q: string
  kind: string
  sort: string
  direction: string
}

export function readBudgetQuery(
  params: Record<string, string | string[] | undefined>,
): BudgetQuery {
  return {
    q: param(params.q).trim(),
    kind: oneOf(
      params.kind,
      TRANSACTION_KINDS.map((entry) => entry.value),
    ),
    sort: oneOf(
      params.sort,
      BUDGET_SORTS.map((entry) => entry.value),
      DEFAULT_BUDGET_SORT,
    ),
    direction: direction(params.direction),
  }
}

/** The plans a query asks for, narrowed and then ordered within each block. */
export function applyBudgetQuery(entries: BudgetEntry[], query: BudgetQuery) {
  const term = query.q.toLowerCase()
  const matching = entries.filter((entry) => {
    if (query.kind && entry.kind !== query.kind) return false
    return matchesTerm(term, [entry.category, entry.costCenter, entry.account, entry.name])
  })

  const descending = query.direction === "desc"

  /** What an ordering compares. Empty means "not on the plan". */
  function key(entry: BudgetEntry) {
    switch (query.sort as BudgetSortValue) {
      case "period":
        return entry.month === null ? "" : String(entry.month).padStart(2, "0")
      case "account":
        return entry.account ?? ""
      case "section":
        return sectionLabel(entry.section)
      case "name":
        return entry.name
      case "costCenter":
        return entry.costCenter ?? ""
      case "warnOnOverrun":
        return entry.warnOnOverrun ? "Yes" : "No"
      case "createdAt":
        return entry.createdAt
      default:
        return entry.category?.trim() ?? ""
    }
  }

  return [...matching].sort((a, b) => {
    const order =
      query.sort === "amount"
        ? descending
          ? b.amount - a.amount
          : a.amount - b.amount
        : compareKeys(key(a), key(b), descending)
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.name.localeCompare(b.name)
  })
}

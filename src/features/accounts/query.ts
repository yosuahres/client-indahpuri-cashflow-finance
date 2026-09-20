import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import type { Account } from "./actions"
import {
  ACCOUNT_OWNERSHIPS,
  ACCOUNT_SORTS,
  DEFAULT_ACCOUNT_SORT,
  type AccountSortValue,
} from "./columns"
import { ACCOUNT_TYPES, accountIssuer, accountTypeSpec } from "./constants"

/** Every filter and ordering the account list understands. */
export type AccountQuery = {
  /** Matches a name, a bank, a holder or an account number. */
  q: string
  type: string
  ownership: string
  sort: string
  direction: string
}

const SORT_KEYS: Record<AccountSortValue, (account: Account) => string> = {
  name: (account) => account.name,
  type: (account) => accountTypeSpec(account.type).label,
  issuer: (account) => accountIssuer(account) ?? "",
  provider: (account) => account.provider ?? "",
  holder: (account) => account.holder ?? "",
  accountNo: (account) => account.accountNo ?? "",
  ownership: (account) => (account.isCompanyAccount ? "Company" : "Personal"),
  notes: (account) => account.notes ?? "",
  createdAt: (account) => account.createdAt,
}

export function readAccountQuery(
  params: Record<string, string | string[] | undefined>,
): AccountQuery {
  return {
    q: param(params.q).trim(),
    type: oneOf(
      params.type,
      ACCOUNT_TYPES.map((type) => type.value),
    ),
    ownership: oneOf(
      params.ownership,
      ACCOUNT_OWNERSHIPS.map((entry) => entry.value),
    ),
    sort: oneOf(
      params.sort,
      ACCOUNT_SORTS.map((entry) => entry.value),
      DEFAULT_ACCOUNT_SORT,
    ),
    direction: direction(params.direction),
  }
}

/** The accounts a query asks for, narrowed and then ordered. */
export function applyAccountQuery(accounts: Account[], query: AccountQuery) {
  const term = query.q.toLowerCase()
  const matching = accounts.filter((account) => {
    if (query.type && account.type !== query.type) return false
    if (query.ownership === "company" && !account.isCompanyAccount) return false
    if (query.ownership === "personal" && account.isCompanyAccount) return false
    // Every field is searched, not just the ones on show.
    return matchesTerm(term, [
      account.name,
      account.provider,
      account.holder,
      account.accountNo,
      account.notes,
    ])
  })

  const key = SORT_KEYS[query.sort as AccountSortValue]
  const descending = query.direction === "desc"
  return [...matching].sort((a, b) => {
    const order = compareKeys(key(a), key(b), descending)
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.name.localeCompare(b.name)
  })
}

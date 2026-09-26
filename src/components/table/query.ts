/** Reading a table's filters and ordering out of the URL, for any page. */

export type SortDirection = "asc" | "desc"

export function param(value: string | string[] | undefined) {
  return typeof value === "string" ? value : ""
}

/** Keeps a choice only while it can still match a row. */
export function oneOf(
  value: string | string[] | undefined,
  allowed: readonly string[],
  fallback = "",
) {
  const choice = param(value)
  return allowed.includes(choice) ? choice : fallback
}

export function direction(
  value: string | string[] | undefined,
  fallback: SortDirection = "asc",
): SortDirection {
  const choice = param(value)
  return choice === "asc" || choice === "desc" ? choice : fallback
}

/**
 * Orders two rows by a text key. An empty key means "not on file", and those
 * rows sort last whichever way the order runs.
 */
export function compareKeys(left: string, right: string, descending: boolean) {
  if (!left !== !right) return left ? -1 : 1
  const order = left.localeCompare(right, undefined, { numeric: true })
  return descending ? -order : order
}

/** Whether every one of `fields` holds the term, ignoring case. */
export function matchesTerm(term: string, fields: (string | null | undefined)[]) {
  if (!term) return true
  return fields.some((field) => (field ?? "").toLowerCase().includes(term))
}

/** A table column a viewer may hide or move. */
export type TableColumn<Key extends string = string> = {
  key: Key
  label: string
  /** Keeps the column from collapsing while the table scrolls sideways. */
  width?: string
}

/**
 * Makes a stored list safe to render: unknown keys (a column since renamed)
 * and repeats are dropped, and anything unreadable falls back to the default.
 */
export function parseColumns<Key extends string>(
  raw: string | null,
  known: readonly Key[],
): Key[] | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!Array.isArray(parsed)) return null

  const allowed = new Set<string>(known)
  const seen = new Set<string>()
  const columns: Key[] = []
  for (const entry of parsed) {
    if (typeof entry !== "string" || !allowed.has(entry) || seen.has(entry)) continue
    seen.add(entry)
    columns.push(entry as Key)
  }
  return columns
}

/** Moves `from` to `to`, leaving the rest in order. */
export function reorderColumns<Key extends string>(columns: Key[], from: number, to: number) {
  if (from === to || to < 0 || to >= columns.length) return columns
  const next = [...columns]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

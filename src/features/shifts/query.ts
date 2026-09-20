import { compareKeys, direction, matchesTerm, oneOf, param } from "@/components/table/query"

import type { Shift } from "./actions"
import { DEFAULT_SHIFT_SORT, SHIFT_SORTS, type ShiftSortValue } from "./columns"

/** What the shifts list is narrowed and ordered by. */
export type ShiftQuery = {
  /** Matches a shift's name. */
  q: string
  sort: string
  direction: string
}

export function readShiftQuery(
  params: Record<string, string | string[] | undefined>,
): ShiftQuery {
  return {
    q: param(params.q).trim(),
    sort: oneOf(
      params.sort,
      SHIFT_SORTS.map((entry) => entry.value),
      DEFAULT_SHIFT_SORT,
    ),
    direction: direction(params.direction),
  }
}

/** The shifts a query asks for, narrowed and then ordered. */
export function applyShiftQuery(
  shifts: Shift[],
  query: ShiftQuery,
  headcount: Record<string, number>,
) {
  const term = query.q.toLowerCase()
  const matching = shifts.filter((shift) => matchesTerm(term, [shift.name]))

  const descending = query.direction === "desc"
  const sign = descending ? -1 : 1

  /** Minutes a shift runs for, counting one that crosses midnight as it falls. */
  const minutes = (shift: Shift) => {
    const [fromHour, fromMinute] = shift.startsAt.split(":").map(Number)
    const [toHour, toMinute] = shift.endsAt.split(":").map(Number)
    const span = toHour * 60 + toMinute - (fromHour * 60 + fromMinute)
    return span <= 0 ? span + 24 * 60 : span
  }

  return [...matching].sort((a, b) => {
    const sort = query.sort as ShiftSortValue
    const order =
      sort === "headcount"
        ? sign * ((headcount[a.id] ?? 0) - (headcount[b.id] ?? 0))
        : sort === "length"
          ? sign * (minutes(a) - minutes(b))
          : compareKeys(
              sort === "createdAt"
                ? a.createdAt
                : sort === "endsAt"
                  ? a.endsAt
                  : sort === "name"
                    ? a.name
                    : a.startsAt,
              sort === "createdAt"
                ? b.createdAt
                : sort === "endsAt"
                  ? b.endsAt
                  : sort === "name"
                    ? b.name
                    : b.startsAt,
              descending,
            )
    // A stable tie-break, so equal rows do not shuffle between renders.
    return order !== 0 ? order : a.name.localeCompare(b.name)
  })
}

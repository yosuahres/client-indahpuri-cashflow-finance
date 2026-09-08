import type { CashFlowSectionKey } from "./types"

export const PERIODICITIES = ["Monthly", "Quarterly", "Yearly"] as const
export type Periodicity = (typeof PERIODICITIES)[number]

/** Categorical slots 1-3 of the validated palette (blue / orange / aqua). */
export const SECTION_COLORS: Record<CashFlowSectionKey, string> = {
  operations: "#2a78d6",
  investing: "#eb6834",
  financing: "#1baf7a",
}

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]

/** Guard against a hand-typed range asking for thousands of columns. */
const MAX_MONTHS = 240

const pad = (value: number) => String(value).padStart(2, "0")

/**
 * Columns covering an arbitrary date range at the chosen granularity, plus a
 * `YYYY-MM` lookup so a transaction can be placed without re-deriving dates.
 *
 * Fiscal-year mode is just a range of Jan 1 to Dec 31, so both filter modes
 * come through here.
 */
export function buildPeriods(from: string, to: string, periodicity: Periodicity) {
  const labels: string[] = []
  const keys: string[] = []
  const monthToIndex = new Map<string, number>()

  let year = Number(from.slice(0, 4))
  let month = Number(from.slice(5, 7)) - 1
  const endYear = Number(to.slice(0, 4))
  const endMonth = Number(to.slice(5, 7)) - 1

  if (!Number.isFinite(year) || !Number.isFinite(endYear)) return { labels, monthToIndex }

  let guard = 0
  while ((year < endYear || (year === endYear && month <= endMonth)) && guard < MAX_MONTHS) {
    guard += 1

    const quarter = Math.floor(month / 3)
    const key =
      periodicity === "Monthly"
        ? `${year}-${month}`
        : periodicity === "Quarterly"
          ? `${year}-Q${quarter}`
          : `${year}`

    let index = keys.indexOf(key)
    if (index === -1) {
      labels.push(
        periodicity === "Monthly"
          ? `${MONTHS[month]} ${year}`
          : periodicity === "Quarterly"
            ? `Q${quarter + 1} ${year}`
            : `${year}`,
      )
      keys.push(key)
      index = keys.length - 1
    }
    monthToIndex.set(`${year}-${pad(month + 1)}`, index)

    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  return { labels, monthToIndex }
}

/** Last day of a month, for turning a fiscal year into a range. */
export function endOfYear(year: number) {
  return `${year}-12-31`
}

export function startOfYear(year: number) {
  return `${year}-01-01`
}

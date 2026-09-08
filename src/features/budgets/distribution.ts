import type { Frequency } from "@/lib/finance"

export type DistributionRow = {
  startDate: string
  endDate: string
  amount: number
  percent: number
}

const pad = (value: number) => String(value).padStart(2, "0")
const lastDayOfMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

/** Month ranges covered by one fiscal year at the given frequency. */
function periodsInYear(year: number, frequency: Frequency) {
  if (frequency === "Yearly") return [{ startMonth: 0, endMonth: 11 }]
  if (frequency === "Quarterly") {
    return [0, 1, 2, 3].map((quarter) => ({
      startMonth: quarter * 3,
      endMonth: quarter * 3 + 2,
    }))
  }
  return Array.from({ length: 12 }, (_, month) => ({
    startMonth: month,
    endMonth: month,
  }))
}

/**
 * Splits a budget evenly across every period in the range. The last row takes
 * the rounding remainder so the rows always add back up to the total.
 */
export function buildDistribution(
  fromYear: number,
  toYear: number,
  frequency: Frequency,
  amount: number,
): DistributionRow[] {
  if (!Number.isFinite(fromYear) || !Number.isFinite(toYear)) return []
  if (toYear < fromYear) return []

  const spans: { year: number; startMonth: number; endMonth: number }[] = []
  for (let year = fromYear; year <= toYear; year += 1) {
    for (const period of periodsInYear(year, frequency)) {
      spans.push({ year, ...period })
    }
  }
  if (spans.length === 0) return []

  const share = Math.round((amount / spans.length) * 100) / 100
  const percent = Math.round((100 / spans.length) * 1000) / 1000

  return spans.map((span, index) => {
    const isLast = index === spans.length - 1
    return {
      startDate: `${span.year}-${pad(span.startMonth + 1)}-01`,
      endDate: `${span.year}-${pad(span.endMonth + 1)}-${pad(
        lastDayOfMonth(span.year, span.endMonth),
      )}`,
      // Absorb the rounding drift in the final row.
      amount: isLast
        ? Math.round((amount - share * (spans.length - 1)) * 100) / 100
        : share,
      percent: isLast
        ? Math.round((100 - percent * (spans.length - 1)) * 1000) / 1000
        : percent,
    }
  })
}

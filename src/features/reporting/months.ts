import type { SettlementFilter } from "@/features/reports/range"

/** Month vocabulary for the Laporan Keuangan, which reads in Indonesian. */

const shortMonth = new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" })
const longMonth = new Intl.DateTimeFormat("id-ID", { month: "long", timeZone: "UTC" })

const pad = (value: number) => String(value).padStart(2, "0")

/** `month` is 1-12 everywhere in this feature, never a zero-based Date month. */
function atMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month - 1, 1))
}

/** "Sep" */
export function shortMonthName(month: number) {
  return shortMonth.format(atMonth(2000, month))
}

/** "September" */
export function longMonthName(month: number) {
  return longMonth.format(atMonth(2000, month))
}

/** "Sep-26" — the column header format the statement uses. */
export function monthColumnLabel(year: number, month: number) {
  return `${shortMonthName(month)}-${pad(year % 100)}`
}

export function firstDayOfMonth(year: number, month: number) {
  return `${year}-${pad(month)}-01`
}

export function lastDayOfMonth(year: number, month: number) {
  return `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`
}

/** `YYYY-MM`, the key every monthly bucket is filed under. */
export function monthKey(year: number, month: number) {
  return `${year}-${pad(month)}`
}

/** Steps one month, rolling the year over at the boundaries. */
export function stepMonth(year: number, month: number, delta: number) {
  const index = (year * 12 + (month - 1)) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/** Reads `year` and `month` off the URL, falling back to the current month. */
export function readReportMonth(params: Record<string, string | string[] | undefined>) {
  const read = (key: string) => {
    const value = params[key]
    return typeof value === "string" ? Number(value) : Number.NaN
  }

  const now = new Date()
  const year = Number.isInteger(read("year")) ? read("year") : now.getUTCFullYear()
  const raw = read("month")
  const month = Number.isInteger(raw) && raw >= 1 && raw <= 12 ? raw : now.getUTCMonth() + 1

  // A hand-typed year far outside the data is a mistake, not a query.
  return { year: Math.min(Math.max(year, 1970), 9999), month }
}

export function readSettlementFilter(
  params: Record<string, string | string[] | undefined>,
  key: string,
): SettlementFilter {
  const value = params[key]
  return value === "unpaid" || value === "all" ? value : "paid"
}

/**
 * Which period a budget screen is looking at. The Anggaran list and the New
 * Budget form offer the same choice — a single month, or a whole year — so the
 * options and the way they are read off a URL live here rather than in either.
 */

import { longMonthName } from "@/features/reporting/months"
import { isBudgetPeriod, type BudgetPeriod } from "@/lib/finance"

export type BudgetPeriodSelection = {
  period: BudgetPeriod
  year: number
  /** 1-12. Kept even on a yearly view, so switching back lands where it left. */
  month: number
}

/** Month names come from the report, so both read a period the same way. */
export const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => ({
  value: String(index + 1),
  label: longMonthName(index + 1),
}))

/** A plan is made for the year ahead, or corrected for one just past. */
export function yearOptions(around: number, { back = 2, ahead = 3 } = {}) {
  return Array.from({ length: back + ahead + 1 }, (_, index) => {
    const year = around - back + index
    return { value: String(year), label: String(year) }
  })
}

/** Reads the period filters off the URL, falling back to the current month. */
export function readBudgetPeriod(
  params: Record<string, string | string[] | undefined>,
): BudgetPeriodSelection {
  const read = (key: string) => {
    const value = params[key]
    return typeof value === "string" ? Number(value) : Number.NaN
  }

  const now = new Date()
  const raw = params.period
  const year = read("year")
  const month = read("month")

  return {
    period: isBudgetPeriod(raw) ? (raw as BudgetPeriod) : "monthly",
    // A hand-typed year far outside the data is a mistake, not a query.
    year: Number.isInteger(year) && year >= 1970 && year <= 9999 ? year : now.getUTCFullYear(),
    month: Number.isInteger(month) && month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1,
  }
}

/** "September 2026" or "2026" — how the chosen period reads in a heading. */
export function periodLabel({ period, year, month }: BudgetPeriodSelection) {
  return period === "monthly" ? `${longMonthName(month)} ${year}` : String(year)
}

/** The query string that puts a screen back on this period. */
export function periodQuery({ period, year, month }: BudgetPeriodSelection) {
  return `?period=${period}&year=${year}&month=${month}`
}

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const idrWhole = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
})

const idrCompact = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** "Rp 1.234.567,00" — the format the finance team reads in ERPNext. */
export function formatCurrency(value: number) {
  return idr.format(value)
}

/** "Rp 1.234.567" — no sen, for headline figures that never carry them. */
export function formatCurrencyWhole(value: number) {
  return idrWhole.format(value)
}

/** Short form for axis ticks: "1,2 jt", "-450 rb". */
export function formatCompact(value: number) {
  if (value === 0) return "0"
  return idrCompact.format(value)
}

const percent = new Intl.NumberFormat("id-ID", {
  style: "percent",
  maximumFractionDigits: 1,
})

/** Share of a whole: "23,4%". Takes a fraction, not a percentage. */
export function formatPercent(value: number) {
  return percent.format(value)
}

const day = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  // occurred_on is a plain calendar date; UTC keeps it off the local clock.
  timeZone: "UTC",
})

/** "8 Sep 2026" from a `YYYY-MM-DD` date. */
export function formatDate(value: string) {
  return day.format(new Date(`${value}T00:00:00Z`))
}

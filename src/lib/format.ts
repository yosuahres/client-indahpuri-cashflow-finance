const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const idrCompact = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
})

/** "Rp 1.234.567,00" — the format the finance team reads in ERPNext. */
export function formatCurrency(value: number) {
  return idr.format(value)
}

/** Short form for axis ticks: "1,2 jt", "-450 rb". */
export function formatCompact(value: number) {
  if (value === 0) return "0"
  return idrCompact.format(value)
}

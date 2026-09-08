/** One plotted series. Colors come from the validated categorical palette. */
export type ChartSeries = {
  key: string
  label: string
  /** Used in the tooltip, where the full label does not fit. */
  shortLabel: string
  color: string
  values: number[]
}

/** One slice of a category breakdown, already resolved to a share and a color. */
export type CategorySlice = {
  label: string
  value: number
  /** Fraction of the pie, 0-1. */
  share: number
  color: string
}

/** One recorded transaction, as the statement's detail table shows it. */
export type TransactionDetail = {
  id: string
  /** `YYYY-MM-DD`. */
  occurredOn: string
  kind: "income" | "expense"
  category: string
  account: string
  amount: number
}

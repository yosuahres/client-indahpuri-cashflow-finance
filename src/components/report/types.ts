/** One plotted series. Colors come from the validated categorical palette. */
export type ChartSeries = {
  key: string
  label: string
  /** Used in the tooltip, where the full label does not fit. */
  shortLabel: string
  color: string
  values: number[]
}

/** How a slice is filled once the eight categorical hues are spent. */
export type SliceTexture = "solid" | "diagonal" | "mirror"

/** One slice of a category breakdown, already resolved to a share and a fill. */
export type CategorySlice = {
  label: string
  value: number
  /** Fraction of the pie, 0-1. */
  share: number
  color: string
  texture: SliceTexture
}

/** One recorded transaction, as the statement's detail table shows it. */
export type TransactionDetail = {
  id: string
  /** `YYYY-MM-DD`. */
  occurredOn: string
  kind: "income" | "expense"
  section: string
  category: string
  account: string
  /** Bank / issuer / holder behind the account, when it has one. */
  accountIssuer: string | null
  amount: number
  /** Whether the money has left yet. Null on income, which has no equivalent. */
  paid: boolean | null
  // Only the detail panel shows these; the table has no column for them.
  party: string
  reference: string
  notes: string
}

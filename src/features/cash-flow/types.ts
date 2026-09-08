import type { ReportRow } from "@/components/report/types"

export type { ReportRow }

export type CashFlowSectionKey = "operations" | "investing" | "financing"

export type CashFlowSeries = {
  key: CashFlowSectionKey
  label: string
  /** Used in the tooltip, where the full label does not fit. */
  shortLabel: string
  /** Categorical slot from the validated palette. */
  color: string
  values: number[]
}

export type CashFlowReport = {
  company: string
  periods: string[]
  rows: ReportRow[]
  series: CashFlowSeries[]
  totals: {
    operations: number
    investing: number
    financing: number
    netChange: number
  }
}

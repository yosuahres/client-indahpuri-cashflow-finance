/** How a row renders. Shared by the Cash Flow and Profit & Loss statements. */
export type RowVariant = "section" | "item" | "total" | "grand" | "spacer"

export type ReportRow = {
  id: string
  label: string
  variant: RowVariant
  /** One value per period, in the report currency. */
  values: number[]
  /** Section rows own the item rows that follow them, and can collapse them. */
  sectionId?: string
}

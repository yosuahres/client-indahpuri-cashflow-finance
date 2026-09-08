/** Shared finance vocabulary used by the report, transactions and budgets. */

export const SECTIONS = [
  { value: "operations", label: "Operations" },
  { value: "investing", label: "Investing" },
  { value: "financing", label: "Financing" },
] as const

export type SectionValue = (typeof SECTIONS)[number]["value"]

export const TRANSACTION_KINDS = [
  { value: "income", label: "Income — money in" },
  { value: "expense", label: "Expense — money out" },
] as const

export type TransactionKind = (typeof TRANSACTION_KINDS)[number]["value"]

export const FREQUENCIES = ["Monthly", "Quarterly", "Yearly"] as const
export type Frequency = (typeof FREQUENCIES)[number]

/** Suggestions only — the category field accepts any text. */
export const CATEGORY_SUGGESTIONS: Record<SectionValue, string[]> = {
  operations: [
    "Sales Revenue",
    "Service Revenue",
    "Salaries & Wages",
    "Rent",
    "Utilities",
    "Office Supplies",
    "Inventory Purchase",
    "Transport & Logistics",
    "Tax Payment",
  ],
  investing: [
    "Fixed Asset Purchase",
    "Fixed Asset Sale",
    "Investment Purchase",
    "Investment Sale",
  ],
  financing: [
    "Equity Injection",
    "Loan Drawdown",
    "Loan Repayment",
    "Dividend Payment",
  ],
}

export function isSection(value: unknown): value is SectionValue {
  return SECTIONS.some((section) => section.value === value)
}

export function isKind(value: unknown): value is TransactionKind {
  return TRANSACTION_KINDS.some((kind) => kind.value === value)
}

export function isFrequency(value: unknown): value is Frequency {
  return FREQUENCIES.includes(value as Frequency)
}

/** Shared finance vocabulary used by the report, transactions and budgets. */

export const SECTIONS = [
  { value: "operations", label: "Operations" },
  { value: "investing", label: "Investing" },
  { value: "financing", label: "Financing" },
] as const

export type SectionValue = (typeof SECTIONS)[number]["value"]

export const TRANSACTION_KINDS = [
  // `short` is for group headings and tight selects, where the gloss does not fit.
  { value: "income", label: "Income — money in", short: "Income" },
  { value: "expense", label: "Expense — money out", short: "Expense" },
] as const

export type TransactionKind = (typeof TRANSACTION_KINDS)[number]["value"]

/**
 * Whether an expense has actually left the account yet. Income has no
 * equivalent — money that has not arrived is not recorded — so only expenses
 * carry one of these.
 */
export const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]["value"]

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return PAYMENT_STATUSES.some((status) => status.value === value)
}

export const FREQUENCIES = ["Monthly", "Quarterly", "Yearly"] as const
export type Frequency = (typeof FREQUENCIES)[number]

/**
 * Suggestions only — the category list is user-managed. Each one is filed
 * under a direction as well as a section, since that is what the transaction
 * form filters the dropdown by.
 */
export const CATEGORY_SUGGESTIONS: {
  name: string
  section: SectionValue
  kind: TransactionKind
}[] = [
  { name: "Sales Revenue", section: "operations", kind: "income" },
  { name: "Service Revenue", section: "operations", kind: "income" },
  { name: "Salaries & Wages", section: "operations", kind: "expense" },
  { name: "Rent", section: "operations", kind: "expense" },
  { name: "Utilities", section: "operations", kind: "expense" },
  { name: "Office Supplies", section: "operations", kind: "expense" },
  { name: "Inventory Purchase", section: "operations", kind: "expense" },
  { name: "Transport & Logistics", section: "operations", kind: "expense" },
  { name: "Tax Payment", section: "operations", kind: "expense" },
  { name: "Fixed Asset Sale", section: "investing", kind: "income" },
  { name: "Investment Sale", section: "investing", kind: "income" },
  { name: "Fixed Asset Purchase", section: "investing", kind: "expense" },
  { name: "Investment Purchase", section: "investing", kind: "expense" },
  { name: "Equity Injection", section: "financing", kind: "income" },
  { name: "Loan Drawdown", section: "financing", kind: "income" },
  { name: "Loan Repayment", section: "financing", kind: "expense" },
  { name: "Dividend Payment", section: "financing", kind: "expense" },
]

/** "Income" / "Expense" — the heading form of a kind. */
export function kindLabel(value: TransactionKind) {
  return TRANSACTION_KINDS.find((entry) => entry.value === value)?.short ?? value
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

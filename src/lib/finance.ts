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

/** Whether money has settled for a transaction. */
export const PAYMENT_STATUSES = [
  { value: "paid", label: "Paid" },
  { value: "unpaid", label: "Unpaid" },
] as const

export const INCOME_PAYMENT_STATUSES = [
  { value: "paid", label: "Setor" },
  { value: "unpaid", label: "Belum setor" },
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]["value"]

export function isPaymentStatus(value: unknown): value is PaymentStatus {
  return PAYMENT_STATUSES.some((status) => status.value === value)
}

/**
 * The period a budget plans for. Monthly puts the whole amount in one month;
 * yearly levels it across the twelve months of the year. Quarterly went with
 * the distribution rows — a quarter is three monthly plans, and the report
 * only ever asks about a month or a year.
 */
export const BUDGET_PERIODS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const

export type BudgetPeriod = (typeof BUDGET_PERIODS)[number]["value"]

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

export function isBudgetPeriod(value: unknown): value is BudgetPeriod {
  return BUDGET_PERIODS.some((period) => period.value === value)
}

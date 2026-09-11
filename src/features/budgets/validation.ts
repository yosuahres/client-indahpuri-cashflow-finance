import { isBudgetPeriod, isKind, isSection } from "@/lib/finance"

export type BudgetInput = {
  name: string
  kind: string
  section: string
  category: string
  costCenter: string
  period: string
  periodYear: string
  periodMonth: string
  amount: string
}

export function readBudget(formData: FormData): BudgetInput {
  const read = (key: string) => String(formData.get(key) ?? "").trim()
  return {
    name: read("name"),
    kind: read("kind"),
    section: read("section"),
    category: read("category"),
    costCenter: read("costCenter"),
    period: read("period"),
    periodYear: read("periodYear"),
    periodMonth: read("periodMonth"),
    amount: read("amount"),
  }
}

export function validateBudget(input: BudgetInput) {
  const errors: Record<string, string> = {}

  if (!input.name) errors.name = "Give this budget a name."
  if (!isKind(input.kind)) errors.kind = "Choose income or expense."
  if (!isSection(input.section)) errors.section = "Choose a cash flow section."
  if (!isBudgetPeriod(input.period)) errors.period = "Choose a monthly or yearly period."

  const year = Number(input.periodYear)
  if (!Number.isInteger(year) || year < 1970 || year > 9999) {
    errors.periodYear = "Choose a year."
  }

  // A yearly plan covers the whole year, so it carries no month at all.
  if (input.period === "monthly") {
    const month = Number(input.periodMonth)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      errors.periodMonth = "Choose a month."
    }
  }

  const amount = Number(input.amount)
  if (!input.amount) errors.amount = "Budget amount is required."
  else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter a positive amount."
  }

  return errors
}

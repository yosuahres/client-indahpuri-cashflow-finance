import { isFrequency, isKind, isSection } from "@/lib/finance"

export type BudgetInput = {
  name: string
  kind: string
  section: string
  category: string
  costCenter: string
  fromYear: string
  toYear: string
  frequency: string
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
    fromYear: read("fromYear"),
    toYear: read("toYear"),
    frequency: read("frequency"),
    amount: read("amount"),
  }
}

export function validateBudget(input: BudgetInput) {
  const errors: Record<string, string> = {}

  if (!input.name) errors.name = "Give this budget a name."
  if (!isKind(input.kind)) errors.kind = "Choose income or expense."
  if (!isSection(input.section)) errors.section = "Choose a cash flow section."
  if (!isFrequency(input.frequency)) errors.frequency = "Choose a frequency."

  const from = Number(input.fromYear)
  const to = Number(input.toYear)
  if (!Number.isInteger(from)) errors.fromYear = "Enter a fiscal year."
  if (!Number.isInteger(to)) errors.toYear = "Enter a fiscal year."
  else if (Number.isInteger(from) && to < from) {
    errors.toYear = "The end year cannot be before the start year."
  }

  const amount = Number(input.amount)
  if (!input.amount) errors.amount = "Budget amount is required."
  else if (!Number.isFinite(amount) || amount <= 0) {
    errors.amount = "Enter a positive amount."
  }

  return errors
}

import { isKind, isPaymentStatus, isSection } from "@/lib/finance"

export type TransactionInput = {
  occurredOn: string
  kind: string
  section: string
  category: string
  account: string
  party: string
  reference: string
  amount: string
  notes: string
  /** "paid" / "unpaid" on an expense; empty on income, which has no equivalent. */
  paid: string
}

export function readTransaction(formData: FormData): TransactionInput {
  const read = (key: string) => String(formData.get(key) ?? "").trim()
  return {
    occurredOn: read("occurredOn"),
    kind: read("kind"),
    section: read("section"),
    category: read("category"),
    account: read("account"),
    party: read("party"),
    reference: read("reference"),
    amount: read("amount"),
    notes: read("notes"),
    paid: read("paid"),
  }
}

export function validateTransaction(input: TransactionInput) {
  const errors: Record<string, string> = {}

  if (!input.occurredOn) errors.occurredOn = "Pick a date."
  else if (Number.isNaN(Date.parse(input.occurredOn))) {
    errors.occurredOn = "That is not a valid date."
  }

  if (!isKind(input.kind)) errors.kind = "Choose income or expense."
  if (!isSection(input.section)) errors.section = "Choose a cash flow section."
  if (!input.category) errors.category = "Category is required."
  if (!input.account) errors.account = "Choose the account the money moved through."

  if (input.kind === "expense" && !isPaymentStatus(input.paid)) {
    errors.paid = "Say whether this has been paid."
  }

  const amount = Number(input.amount)
  if (!input.amount) errors.amount = "Amount is required."
  else if (!Number.isFinite(amount)) errors.amount = "Amount must be a number."
  else if (amount <= 0) {
    // Direction lives in `kind`, so a negative amount here is always a mistake.
    errors.amount = "Enter a positive amount — income or expense is set above."
  }

  return errors
}

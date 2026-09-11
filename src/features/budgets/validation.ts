import { isBudgetPeriod, isKind, isSection } from "@/lib/finance"

/** One grid line as it arrives from the browser, before anything is trusted. */
export type PlanLineInput = {
  category: string
  section: string
  /** Slot ("0" for a yearly plan, "1"-"12" for a month) to raw digits. */
  amounts: Record<string, string>
}

export type BudgetPlanInput = {
  account: string
  kind: string
  period: string
  year: string
  costCenter: string
  lines: PlanLineInput[]
  /** Set when `lines` did not arrive as the shape above. */
  malformed: boolean
}

/**
 * The grid posts its rows as one JSON field rather than a few hundred named
 * inputs — twelve months across a dozen categories is a lot of `name`
 * attributes, and the shape is checked here either way.
 */
export function readBudgetPlan(formData: FormData): BudgetPlanInput {
  const read = (key: string) => String(formData.get(key) ?? "").trim()

  let lines: PlanLineInput[] = []
  let malformed = false

  try {
    const parsed: unknown = JSON.parse(String(formData.get("lines") ?? "[]"))
    if (!Array.isArray(parsed)) throw new Error("not an array")

    lines = parsed.map((entry) => {
      const row = entry as Record<string, unknown>
      const amounts = row.amounts
      return {
        category: String(row.category ?? "").trim(),
        section: String(row.section ?? "").trim(),
        amounts:
          amounts && typeof amounts === "object" && !Array.isArray(amounts)
            ? Object.fromEntries(
                Object.entries(amounts as Record<string, unknown>).map(([slot, value]) => [
                  slot,
                  String(value ?? "").trim(),
                ]),
              )
            : {},
      }
    })
  } catch {
    malformed = true
  }

  return {
    account: read("account"),
    kind: read("kind"),
    period: read("period"),
    year: read("year"),
    costCenter: read("costCenter"),
    lines,
    malformed,
  }
}

/** A slot is a month 1-12 on a monthly plan, or the single 0 on a yearly one. */
function isSlot(slot: string, monthly: boolean) {
  const value = Number(slot)
  if (!Number.isInteger(value)) return false
  return monthly ? value >= 1 && value <= 12 : value === 0
}

export function validateBudgetPlan(input: BudgetPlanInput) {
  const errors: Record<string, string> = {}

  if (input.malformed) errors.lines = "The grid could not be read. Reload and try again."
  if (!input.account) errors.account = "Choose the account this plans."
  if (!isKind(input.kind)) errors.kind = "Choose income or expense."
  if (!isBudgetPeriod(input.period)) errors.period = "Choose a monthly or yearly period."

  const year = Number(input.year)
  if (!Number.isInteger(year) || year < 1970 || year > 9999) errors.year = "Choose a year."

  const monthly = input.period === "monthly"
  let filled = 0

  for (const line of input.lines) {
    const figures = Object.entries(line.amounts).filter(([slot, value]) => {
      const amount = Number(value)
      return value !== "" && isSlot(slot, monthly) && Number.isFinite(amount) && amount > 0
    })

    if (figures.length === 0) continue
    filled += figures.length

    // A figure with nothing to file it under cannot be saved, and dropping it
    // silently would look like the save had lost it.
    if (!line.category) {
      errors.lines = "Every row with a figure in it needs a category."
    } else if (!isSection(line.section)) {
      errors.lines = `"${line.category}" is not filed under a cash flow section.`
    }
  }

  // Saving an empty grid is how a whole plan is cleared, so it is only an
  // error when nothing was there to begin with — which the action decides.
  return { errors, filled, monthly, year }
}

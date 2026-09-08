import { accountTypeSpec, isAccountType } from "./constants"

export type AccountInput = {
  name: string
  type: string
  provider: string
  accountNo: string
  holder: string
  notes: string
}

export function readAccount(formData: FormData): AccountInput {
  const read = (key: string) => String(formData.get(key) ?? "").trim()
  return {
    name: read("name"),
    type: read("type"),
    provider: read("provider"),
    accountNo: read("accountNo"),
    holder: read("holder"),
    notes: read("notes"),
  }
}

export function validateAccount(input: AccountInput) {
  const errors: Record<string, string> = {}

  if (!input.name) errors.name = "Give the account a name."
  else if (input.name.length > 80) errors.name = "Keep the name under 80 characters."

  if (!isAccountType(input.type)) {
    errors.type = "Choose an account type."
    return errors
  }

  // Only fields the chosen type actually shows are worth checking.
  const spec = accountTypeSpec(input.type)
  if (spec.accountNo && input.accountNo.length > 40) {
    errors.accountNo = "That number looks too long."
  }
  if (spec.provider && !input.provider) {
    errors.provider = `${spec.provider.label} is required for this account type.`
  }

  return errors
}

/** Blanks out anything the chosen type does not use, so stale values are not stored. */
export function forType(input: AccountInput) {
  const spec = accountTypeSpec(input.type)
  return {
    provider: spec.provider ? input.provider || null : null,
    account_no: spec.accountNo ? input.accountNo || null : null,
    holder: spec.holder ? input.holder || null : null,
    notes: spec.notes ? input.notes || null : null,
  }
}

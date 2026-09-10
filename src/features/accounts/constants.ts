/**
 * Account types and the fields each one actually needs. A petty cash tin has
 * no account number; an e-wallet has no bank. The form asks for the name and
 * the type first, then shows only what applies.
 */
export type AccountTypeValue =
  | "bank"
  | "cash"
  | "e_wallet"
  | "credit_card"
  | "other"

export type AccountTypeSpec = {
  value: AccountTypeValue
  label: string
  /** Bank / issuer / wallet provider. Omitted when the type has none. */
  provider?: { label: string; placeholder: string }
  /** Account number / card number / wallet id. */
  accountNo?: { label: string; placeholder: string }
  /** Who physically holds the money. */
  holder?: { label: string; placeholder: string }
  /** Free text, for anything that does not fit. */
  notes?: { label: string; placeholder: string }
}

export const ACCOUNT_TYPES: AccountTypeSpec[] = [
  {
    value: "bank",
    label: "Bank",
    provider: { label: "Bank", placeholder: "e.g. BCA, Mandiri, BRI" },
    accountNo: { label: "Account No.", placeholder: "e.g. 1234567890" },
  },
  {
    // Covers petty cash — the account's name says which tin it is.
    value: "cash",
    label: "Cash",
    holder: { label: "Held By", placeholder: "e.g. Front Office" },
  },
  {
    value: "e_wallet",
    label: "E-Wallet",
    provider: { label: "Provider", placeholder: "e.g. GoPay, OVO, DANA" },
    accountNo: { label: "Phone / Account ID", placeholder: "e.g. 0812…" },
  },
  {
    value: "credit_card",
    label: "Credit Card",
    provider: { label: "Issuer", placeholder: "e.g. BCA" },
    accountNo: { label: "Card Number", placeholder: "Last 4 digits are enough" },
  },
  {
    value: "other",
    label: "Other",
    notes: {
      label: "Description",
      placeholder: "e.g. Midtrans settlement, Tokopedia seller balance",
    },
  },
]

export function accountTypeSpec(value: string): AccountTypeSpec {
  return ACCOUNT_TYPES.find((type) => type.value === value) ?? ACCOUNT_TYPES[0]
}

export function isAccountType(value: unknown): value is AccountTypeValue {
  return ACCOUNT_TYPES.some((type) => type.value === value)
}

/**
 * The bank, card issuer, wallet provider or cash holder — whichever the type
 * actually carries. An account name alone ("Operasional") does not say where
 * the money sits, so lists show this beside it.
 */
export function accountIssuer(account: {
  type: string
  provider?: string | null
  holder?: string | null
}): string | null {
  const spec = accountTypeSpec(account.type)
  if (spec.provider) return account.provider?.trim() || null
  if (spec.holder) return account.holder?.trim() || null
  return null
}

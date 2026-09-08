import type { Metadata } from "next"

import { listAccounts } from "@/features/accounts/actions"
import { listCategories } from "@/features/categories/actions"
import { TransactionForm } from "@/features/transactions/components/transaction-form"

export const metadata: Metadata = {
  title: "New Transaction",
}

export default async function NewTransactionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams

  // Computed on the server so the default date follows the request, not the
  // browser clock, and stays stable through hydration.
  const today = new Date().toISOString().slice(0, 10)

  const [categories, accounts] = await Promise.all([listCategories(), listAccounts()])

  // Set by the New Account page when it sends you back here.
  const defaultAccount =
    typeof params.account === "string" ? params.account : undefined

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <TransactionForm
        today={today}
        initialCategories={categories.categories}
        initialAccounts={accounts.accounts}
        defaultAccount={defaultAccount}
        setupError={
          categories.ok ? (accounts.ok ? undefined : accounts.error) : categories.error
        }
      />
    </div>
  )
}

import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { getAccount } from "@/features/accounts/actions"
import { AccountForm } from "@/features/accounts/components/account-form"

export const metadata: Metadata = {
  title: "Edit Account",
}

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const result = await getAccount(id)

  if (!result.ok) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {result.error}
        </p>
      </div>
    )
  }
  if (!result.account) notFound()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <AccountForm account={result.account} />
    </div>
  )
}

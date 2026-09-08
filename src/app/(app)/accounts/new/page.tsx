import type { Metadata } from "next"

import { AccountForm } from "@/features/accounts/components/account-form"
import { safeRedirectPath } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "New Account",
}

export default async function NewAccountPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  // Where to go back to once the account is saved.
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : undefined,
    "/transactions/new",
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <AccountForm next={next} />
    </div>
  )
}

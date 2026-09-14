import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { Card, CardHeader } from "@/components/ui/card"
import { listAccounts } from "@/features/accounts/actions"
import { AccountTable } from "@/features/accounts/components/account-table"

export const metadata: Metadata = {
  title: "Accounts",
}

export default async function AccountsPage() {
  const result = await listAccounts()

  return (
    <>
      <Topbar
        title="Accounts"
        section={null}
        actions={
          // Back here once it is saved, rather than off to a transaction.
          <Link
            href={`/accounts/new?next=${encodeURIComponent("/accounts")}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-black/10 px-2.5 text-sm text-neutral-700 hover:border-black/20 hover:text-neutral-900 sm:h-8"
          >
            <Plus className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden sm:inline">New Account</span>
          </Link>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50">
        {!result.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <div className="p-4 sm:p-6">
          <Card className="overflow-hidden">
            <CardHeader
              title="Your accounts"
            />
            <div className="mt-4">
              <AccountTable accounts={result.accounts} />
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { listAccounts } from "@/features/accounts/actions"
import { AccountList } from "@/features/accounts/components/account-list"
import { applyAccountQuery, readAccountQuery } from "@/features/accounts/query"
import { requirePermission } from "@/features/auth/session"

export const metadata: Metadata = {
  title: "Accounts",
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("accounts.manage")
  const [params, result] = await Promise.all([searchParams, listAccounts()])
  const query = readAccountQuery(params)

  return (
    <>
      <Topbar
        title="Accounts"
        section={null}
        actions={
          // Back here once it is saved, rather than off to a transaction.
          <Link
            href={`/accounts/new?next=${encodeURIComponent("/accounts")}`}
            className={TOPBAR_ACTION_CLASS}
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">New Account</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AccountList
          accounts={applyAccountQuery(result.accounts, query)}
          query={query}
          notice={result.ok ? undefined : result.error}
        />
      </main>
    </>
  )
}

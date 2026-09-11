import { Suspense } from "react"
import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { listAccounts } from "@/features/accounts/actions"
import { listCategories } from "@/features/categories/actions"
import { ReportFilters } from "@/components/report/report-filters"
import { TransactionTable } from "@/components/report/transaction-table"
import { readReportRange } from "@/features/reports/range"
import { loadProfitAndLossReport } from "@/features/profit-and-loss/report"

export const metadata: Metadata = {
  title: "Profit and Loss",
}

/** Holds the table's shape while the ledger is on its way. */
function LedgerFallback() {
  return (
    <LoadingRegion label="Loading transactions">
      <div className="space-y-2 p-4 sm:p-6">
        <Skeleton className="h-9" />
        {Array.from({ length: 12 }, (_, row) => (
          <Skeleton key={row} className="h-11" />
        ))}
      </div>
    </LoadingRegion>
  )
}

/**
 * The ledger, and the pickers the detail panel edits it with. Kept apart from
 * the page so the bar and the filters can be sent before any of it is ready.
 */
async function Ledger({ range }: { range: ReturnType<typeof readReportRange> }) {
  // The detail panel edits a row in place, so it needs the same pickers the
  // New Transaction form uses. All three go out together: they share the one
  // request-scoped Supabase client, which serializes its own token refresh, so
  // the page waits for the slowest query rather than for the sum of them.
  const [{ ok, error, report }, categories, accounts] = await Promise.all([
    loadProfitAndLossReport({
      from: range.from,
      to: range.to,
      periodicity: range.periodicity,
      kind: range.kind,
    }),
    listCategories(),
    listAccounts(),
  ])

  return (
    <>
      {!ok ? (
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {error}
        </p>
      ) : null}

      <TransactionTable
        transactions={report.transactions}
        caption="Every transaction recorded in the range, newest first."
        categories={categories.categories}
        accounts={accounts.accounts}
        today={range.today}
      />
    </>
  )
}

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const range = readReportRange(await searchParams)

  return (
    <>
      <Topbar title="Profit and Loss" />

      <main className="min-h-0 flex-1 overflow-y-auto">
        <ReportFilters
          company={range.company}
          mode={range.mode}
          fromYear={range.fromYear}
          toYear={range.toYear}
          from={range.customFrom}
          to={range.customTo}
          periodicity={range.periodicity}
          kind={range.kind}
          today={range.today}
        />

        <Suspense key={`${range.from}:${range.to}:${range.periodicity}:${range.kind}`} fallback={<LedgerFallback />}>
          <Ledger range={range} />
        </Suspense>
      </main>
    </>
  )
}

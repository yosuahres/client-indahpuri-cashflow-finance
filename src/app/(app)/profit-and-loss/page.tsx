import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { ReportFilters } from "@/components/report/report-filters"
import { TransactionTable } from "@/components/report/transaction-table"
import { readReportRange } from "@/features/reports/range"
import { loadProfitAndLossReport } from "@/features/profit-and-loss/report"

export const metadata: Metadata = {
  title: "Profit and Loss",
}

export default async function ProfitAndLossPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const range = readReportRange(await searchParams)

  const { ok, error, report } = await loadProfitAndLossReport({
    from: range.from,
    to: range.to,
    periodicity: range.periodicity,
  })

  return (
    <>
      <Topbar title="Profit and Loss" />

      <main className="min-h-0 flex-1 overflow-y-auto">
        {!ok ? (
          <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
            {error}
          </p>
        ) : null}

        <ReportFilters
          company={range.company}
          mode={range.mode}
          fromYear={range.fromYear}
          toYear={range.toYear}
          from={range.customFrom}
          to={range.customTo}
          periodicity={range.periodicity}
          today={range.today}
        />

        <TransactionTable
          transactions={report.transactions}
          caption="Every transaction recorded in the range, newest first."
        />
      </main>
    </>
  )
}

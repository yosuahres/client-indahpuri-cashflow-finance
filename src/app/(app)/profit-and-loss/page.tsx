import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { ReportTable } from "@/components/report/report-table"
import { SummaryTiles } from "@/components/report/summary-tiles"
import { ReportFilters } from "@/features/cash-flow/components/report-filters"
import { readReportRange } from "@/features/cash-flow/range"
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
          <p role="alert" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
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

        <SummaryTiles
          tiles={[
            { label: "Total Income", value: report.totals.income },
            { label: "Total Expense", value: report.totals.expense },
            { label: "Net Profit", value: report.totals.netProfit, tone: "red" as const },
          ]}
        />

        <ReportTable
          periods={report.periods}
          rows={report.rows}
          caption="Income and expense by category and period."
        />
      </main>
    </>
  )
}

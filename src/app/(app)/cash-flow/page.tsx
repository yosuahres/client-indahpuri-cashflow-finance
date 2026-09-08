import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { ReportTable } from "@/components/report/report-table"
import { SummaryTiles } from "@/components/report/summary-tiles"
import { CashFlowChart } from "@/features/cash-flow/components/cash-flow-chart"
import { ReportFilters } from "@/features/cash-flow/components/report-filters"
import { readReportRange } from "@/features/cash-flow/range"
import { loadCashFlowReport } from "@/features/cash-flow/report"

export const metadata: Metadata = {
  title: "Cash Flow",
}

export default async function CashFlowPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const range = readReportRange(await searchParams)

  const { ok, error, report } = await loadCashFlowReport({
    company: range.company,
    from: range.from,
    to: range.to,
    periodicity: range.periodicity,
  })

  return (
    <>
      <Topbar title="Cash Flow" statement="/cash-flow" />

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
            { label: "Net Cash from Operations", value: report.totals.operations },
            { label: "Net Cash from Investing", value: report.totals.investing },
            { label: "Net Cash from Financing", value: report.totals.financing },
            { label: "Net Change in Cash", value: report.totals.netChange },
          ]}
        />

        <section aria-label="Cash flow by section" className="px-6 py-8">
          <CashFlowChart periods={report.periods} series={report.series} />
        </section>

        <ReportTable
          periods={report.periods}
          rows={report.rows}
          caption="Cash flow by section and period, the same figures plotted in the chart above."
        />
      </main>
    </>
  )
}

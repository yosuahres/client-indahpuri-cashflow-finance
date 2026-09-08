import type { Metadata } from "next"
import Link from "next/link"

import { Topbar } from "@/components/layout/topbar"
import { CategoryPie } from "@/components/report/category-pie"
import { ReportFilters } from "@/components/report/report-filters"
import { SeriesChart } from "@/components/report/series-chart"
import { SummaryTiles } from "@/components/report/summary-tiles"
import { readReportRange } from "@/features/reports/range"
import { loadProfitAndLossReport } from "@/features/profit-and-loss/report"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const range = readReportRange(params)

  const { ok, error, report } = await loadProfitAndLossReport({
    from: range.from,
    to: range.to,
    periodicity: range.periodicity,
  })

  // Carry the active filters over, so the statement opens on the same range.
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value)
  }
  const suffix = query.toString() ? `?${query}` : ""

  return (
    <>
      <Topbar title="Dashboard" section={null} />

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

        <section aria-labelledby="dashboard-profit-and-loss">
          <div className="flex items-center justify-between gap-3 px-6 pt-7">
            <h2 id="dashboard-profit-and-loss" className="text-sm font-semibold text-neutral-900">
              Profit and Loss
            </h2>
            {/* The chart's aqua series sits under 3:1 on white, so the full
                table it summarises is always one click away. */}
            <Link
              href={`/profit-and-loss${suffix}`}
              className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900"
            >
              View statement
            </Link>
          </div>

          <SummaryTiles
            tiles={[
              { label: "Total Income", value: report.totals.income },
              { label: "Total Expense", value: report.totals.expense },
              { label: "Net Profit", value: report.totals.netProfit, tone: "red" as const },
            ]}
          />

          <div className="px-6 py-8">
            <SeriesChart
              periods={report.periods}
              series={report.series}
              label="Income, expense and net profit for each period"
            />
          </div>
        </section>

        <section
          aria-labelledby="dashboard-by-category"
          className="border-t border-black/8 px-6 pt-7 pb-10"
        >
          <h2 id="dashboard-by-category" className="text-sm font-semibold text-neutral-900">
            By Category
          </h2>

          <div className="mt-6 grid gap-x-10 gap-y-10 xl:grid-cols-2">
            <CategoryPie
              title="Income"
              slices={report.breakdown.income}
              emptyLabel="No income recorded in this range."
            />
            <CategoryPie
              title="Expense"
              slices={report.breakdown.expense}
              emptyLabel="No expense recorded in this range."
            />
          </div>
        </section>
      </main>
    </>
  )
}

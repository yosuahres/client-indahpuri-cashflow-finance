import type { Metadata } from "next"
import Link from "next/link"

import { Topbar } from "@/components/layout/topbar"
import { CategoryPie } from "@/components/report/category-pie"
import { ReportFilters } from "@/components/report/report-filters"
import { SeriesChart } from "@/components/report/series-chart"
import { SummaryTiles } from "@/components/report/summary-tiles"
import type { ChartSeries } from "@/components/report/types"
import { Card, CardHeader } from "@/components/ui/card"
import { readReportRange } from "@/features/reports/range"
import { loadProfitAndLossReport } from "@/features/profit-and-loss/report"

export const metadata: Metadata = {
  title: "Dashboard",
}

/** What each plotted series measures, said in words under its card title. */
const CAPTIONS: Record<string, string> = {
  income: "Money in, per period",
  expense: "Money out, per period",
  "net-profit": "Income minus expense, per period",
}

/** Height of a facet, x-axis band included, so no card scrolls vertically. */
const FACET_HEIGHT = 220

/**
 * One series, one card. Split apart, income and expense can no longer be
 * mistaken for one another — but they only stay comparable because every facet
 * is handed the same value axis.
 */
function ChartCard({
  entry,
  periods,
  domainValues,
}: {
  entry: ChartSeries
  periods: string[]
  domainValues: number[]
}) {
  return (
    <Card className="min-w-0">
      <CardHeader title={entry.label} caption={CAPTIONS[entry.key]} />
      <div className="px-2 pt-3 pb-4 sm:px-3">
        <SeriesChart
          periods={periods}
          series={[entry]}
          domainValues={domainValues}
          height={FACET_HEIGHT}
          label={`${entry.label} for each period`}
        />
      </div>
    </Card>
  )
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

  // One axis across all three facets.
  const domainValues = report.series.flatMap((entry) => entry.values)

  return (
    <>
      <Topbar title="Dashboard" section={null} />

      <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50">
        {!ok ? (
          <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
            {error}
          </p>
        ) : null}

        {/* One filter row above everything it scopes, held on white so it
            reads as the page's toolbar rather than another card. */}
        <div className="border-b border-black/8 bg-white">
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
        </div>

        <div className="space-y-6 p-4 sm:space-y-8 sm:p-6">
          <SummaryTiles
            tiles={[
              { label: "Total Income", value: report.totals.income },
              { label: "Total Expense", value: report.totals.expense },
              { label: "Net Profit", value: report.totals.netProfit, tone: "red" as const },
            ]}
          />

          <section aria-labelledby="dashboard-profit-and-loss">
            <div className="flex items-center justify-between gap-3">
              <h2 id="dashboard-profit-and-loss" className="text-sm font-semibold text-neutral-900">
                Profit and Loss
              </h2>
              {/* Every figure the plots carry is also in the statement table. */}
              <Link
                href={`/profit-and-loss${suffix}`}
                className="shrink-0 text-sm text-neutral-500 hover:text-neutral-900"
              >
                View statement
              </Link>
            </div>

            {/* Stacked rather than side by side: the facets then share an x
                position as well as a scale, and none has to scroll. */}
            <div className="mt-4 space-y-4">
              {report.series.map((entry) => (
                <ChartCard
                  key={entry.key}
                  entry={entry}
                  periods={report.periods}
                  domainValues={domainValues}
                />
              ))}
            </div>
          </section>

          <section aria-labelledby="dashboard-by-category">
            <h2 id="dashboard-by-category" className="text-sm font-semibold text-neutral-900">
              By Category
            </h2>

            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <Card className="min-w-0 p-4 sm:p-5">
                <CategoryPie
                  title="Income"
                  slices={report.breakdown.income}
                  emptyLabel="No income recorded in this range."
                />
              </Card>
              <Card className="min-w-0 p-4 sm:p-5">
                <CategoryPie
                  title="Expense"
                  slices={report.breakdown.expense}
                  emptyLabel="No expense recorded in this range."
                />
              </Card>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

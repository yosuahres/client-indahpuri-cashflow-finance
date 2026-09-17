import { Suspense, type ReactNode } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { Topbar } from "@/components/layout/topbar"
import { CategoryPie } from "@/components/report/category-pie"
import { ReportFilters } from "@/components/report/report-filters"
import { SeriesChart } from "@/components/report/series-chart"
import { SummaryTiles } from "@/components/report/summary-tiles"
import type { ChartSeries } from "@/components/report/types"
import { CARD_ACTION_CLASS, Card, CardHeader } from "@/components/ui/card"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { listAccounts } from "@/features/accounts/actions"
import { canVisit, type Permission } from "@/features/auth/permissions"
import type { Role } from "@/features/auth/roles"
import { requireUser } from "@/features/auth/session"
import { PlanVsActualTable } from "@/features/budgets/components/plan-vs-actual-table"
import { loadPlanVsActual } from "@/features/budgets/plan-vs-actual"
import { readReportRange } from "@/features/reports/range"
import { loadProfitAndLossSummary } from "@/features/profit-and-loss/report"

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
const FACET_HEIGHT = 170

/**
 * One series, one card. Split apart, income and expense can no longer be
 * mistaken for one another — but they only stay comparable because every facet
 * is handed the same value axis.
 */
function ChartCard({
  entry,
  periods,
  domainValues,
  action,
}: {
  entry: ChartSeries
  periods: string[]
  domainValues: number[]
  action?: ReactNode
}) {
  return (
    <Card variant="flat" className="min-w-0">
      <CardHeader
        variant="flat"
        title={entry.label}
        caption={CAPTIONS[entry.key]}
        action={action}
      />
      <div className="px-2 pt-2 pb-3 sm:px-3">
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

/** Holds the shape of the figures while the database is still answering. */
function DashboardFallback() {
  return (
    <LoadingRegion label="Loading the dashboard figures">
      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-[82px]" />
          ))}
        </div>
        {[0, 1, 2].map((facet) => (
          <Skeleton key={facet} className="h-[234px]" />
        ))}
        <Skeleton className="h-[220px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[250px]" />
          <Skeleton className="h-[250px]" />
        </div>
      </div>
    </LoadingRegion>
  )
}

/**
 * The half of the page that waits on the database, kept separate so the rest
 * does not have to. Everything above it — the bar, the filter row — is sent as
 * soon as the request arrives; these figures replace the skeleton when they
 * land.
 */
async function DashboardFigures({
  range,
  suffix,
  role,
  permissions,
}: {
  range: ReturnType<typeof readReportRange>
  suffix: string
  /** Links out to pages this role cannot open are left off. */
  role: Role
  permissions: Permission[]
}) {
  // Only the plotted figures, not the ledger behind them: the dashboard shows
  // no transaction rows, so it never asks for any. All three go out together:
  // they share the one request-scoped Supabase client, which serializes its own
  // token refresh, so this waits for the slowest rather than for the sum.
  const [{ ok, error, report }, plan, accounts] = await Promise.all([
    loadProfitAndLossSummary({
      from: range.from,
      to: range.to,
      periodicity: range.periodicity,
    }),
    loadPlanVsActual({ from: range.from, to: range.to }),
    listAccounts(),
  ])

  // One axis across all three facets.
  const domainValues = report.series.flatMap((entry) => entry.values)

  return (
    <>
      {!ok || !plan.ok ? (
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {error ?? plan.error}
        </p>
      ) : null}

      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        <SummaryTiles
          tiles={[
            {
              label: "Saldo Awal",
              description: `From previous year ${range.fromYear - 1}`,
              value: report.totals.openingBalance,
            },
            { label: "Total Income", value: report.totals.income },
            { label: "Total Expense", value: report.totals.expense },
            {
              label: "Net Profit",
              description: "Saldo Awal + Total Income - Total Expense",
              value: report.totals.netProfit,
              tone: "red" as const,
            },
          ]}
          variant="flat"
        />

        <section aria-labelledby="dashboard-profit-and-loss">
          {/* The cards carry their own titles; the section name is for
              screen readers only. */}
          <h2 id="dashboard-profit-and-loss" className="sr-only">
            Profit and Loss
          </h2>

          {/* Stacked rather than side by side: the facets then share an x
              position as well as a scale, and none has to scroll. Each is
              kept wide and short so the three fit on one screen. */}
          <div className="space-y-4">
            {report.series.map((entry, index) => (
              <ChartCard
                key={entry.key}
                entry={entry}
                periods={report.periods}
                domainValues={domainValues}
                action={
                  // Every figure the plots carry is also in the statement table.
                  index === 0 && canVisit(role, permissions, "/profit-and-loss") ? (
                    <Link href={`/profit-and-loss${suffix}`} className={CARD_ACTION_CLASS}>
                      View statement
                    </Link>
                  ) : null
                }
              />
            ))}
          </div>
        </section>

        <section aria-labelledby="dashboard-plan-vs-actual">
          <Card variant="flat" className="min-w-0 overflow-hidden">
            <CardHeader
              variant="flat"
              id="dashboard-plan-vs-actual"
              title="Plan vs Actual by Account"
              caption="Yearly plans count a twelfth per month, so a part-year range carries a part of them. Actuals include unpaid bills, as the figures above do."
              action={
                // The dashboard's own filters mean nothing to the Anggaran page,
                // so the link carries the year this range ends in instead.
                canVisit(role, permissions, "/budgets") ? (
                  <Link
                    href={`/budgets?period=yearly&year=${range.to.slice(0, 4)}`}
                    className={CARD_ACTION_CLASS}
                  >
                    View budgets
                  </Link>
                ) : null
              }
            />
            <div className="mt-3">
              <PlanVsActualTable
                rows={plan.rows}
                totals={plan.totals}
                accounts={accounts.accounts}
              />
            </div>
          </Card>
        </section>

        <section aria-labelledby="dashboard-by-category">
          <h2 id="dashboard-by-category" className="sr-only">
            By Category
          </h2>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card variant="flat" className="min-w-0">
              <CardHeader variant="flat" title="Income by Category" caption="Money in, per category" />
              <div className="p-2.5 pt-3">
                <CategoryPie
                  bare
                  title="Income"
                  slices={report.breakdown.income}
                  emptyLabel="No income recorded in this range."
                />
              </div>
            </Card>
            <Card variant="flat" className="min-w-0">
              <CardHeader variant="flat" title="Expense by Category" caption="Money out, per category" />
              <div className="p-2.5 pt-3">
                <CategoryPie
                  bare
                  title="Expense"
                  slices={report.breakdown.expense}
                  emptyLabel="No expense recorded in this range."
                />
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const [params, user] = await Promise.all([searchParams, requireUser()])
  const range = readReportRange(params)

  // Carry the active filters over, so the statement opens on the same range.
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") query.set(key, value)
  }
  const suffix = query.toString() ? `?${query}` : ""

  return (
    <>
      <Topbar title="Dashboard" section={null} />

      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
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

        {/* Keyed on the range so changing a filter shows the skeleton again
            rather than leaving the old figures up while the new ones load. */}
        <Suspense key={`${range.from}:${range.to}:${range.periodicity}`} fallback={<DashboardFallback />}>
          <DashboardFigures range={range} suffix={suffix} role={user.role} permissions={user.permissions} />
        </Suspense>
      </main>
    </>
  )
}

import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { Topbar } from "@/components/layout/topbar"
import { CARD_ACTION_CLASS } from "@/components/ui/card"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/features/auth/session"
import { EMPLOYMENT_COLORS, GENDER_COLORS, STATUS_COLORS } from "@/features/employees/chart-colors"
import { BreakdownList } from "@/features/employees/components/breakdown-list"
import { AgePyramid } from "@/features/employees/components/charts/age-pyramid"
import { ChartCard } from "@/features/employees/components/charts/chart-card"
import { ColumnChart } from "@/features/employees/components/charts/column-chart"
import { DonutChart } from "@/features/employees/components/charts/donut-chart"
import { SegmentedBar } from "@/features/employees/components/charts/segmented-bar"
import { TrendChart } from "@/features/employees/components/charts/trend-chart"
import { WaffleChart } from "@/features/employees/components/charts/waffle-chart"
import { StatTiles } from "@/features/employees/components/stat-tiles"
import { loadHrStats } from "@/features/employees/dashboard"
import { formatCurrency, formatPercent } from "@/lib/format"

export const metadata: Metadata = {
  title: "HR Dashboard",
}

/** Holds the shape of the figures while the database is still answering. */
function DashboardFallback() {
  return (
    <LoadingRegion label="Loading the HR figures">
      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-[82px]" />
          ))}
        </div>
        <Skeleton className="h-[240px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1, 2, 3].map((card) => (
            <Skeleton key={card} className="h-[200px]" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  )
}

/**
 * The half of the page that waits on the database, kept separate so the bar
 * above it can be sent as soon as the request arrives.
 */
async function HrFigures() {
  const { error, stats } = await loadHrStats()

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        <StatTiles
          tiles={[
            {
              label: "Headcount",
              value: String(stats.headcount),
              description: `${stats.offRoll} not active`,
            },
            { label: "Active", value: String(stats.active), description: "On the roll today" },
            {
              label: "Joined This Year",
              value: String(stats.joinedThisYear),
              description: "Active people, by date of joining",
            },
            {
              label: "Monthly Payroll",
              value: formatCurrency(stats.monthlyPayroll),
              // Anyone with no salary on file contributes nothing, so the
              // figure is a floor rather than the whole bill.
              description:
                stats.salaryKnown < stats.active
                  ? `Salary on file for ${stats.salaryKnown} of ${stats.active}`
                  : "Basic salary plus fixed allowance",
            },
          ]}
        />

        <section>
          <BreakdownList
            title="Headcount by Department"
            caption="Active people. Anyone with no department set is counted as unassigned."
            slices={stats.byDepartment}
            emptyLabel="No active employees yet."
            action={
              <Link href="/hris/employees" className={CARD_ACTION_CLASS}>
                View employees
              </Link>
            }
          />
        </section>

        <section aria-labelledby="hr-composition">
          <h2 id="hr-composition" className="sr-only">
            Workforce composition
          </h2>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard
              title="By Employment Status"
              caption="Active people, per contract type"
              empty={stats.byEmploymentType.length === 0}
              emptyLabel="No active employees yet."
            >
              <DonutChart
                slices={stats.byEmploymentType}
                colors={EMPLOYMENT_COLORS}
                label="Active people by contract type"
                totalLabel="active"
              />
            </ChartCard>
            <ChartCard
              title="By Status"
              caption="Everyone on file, active or not"
              empty={stats.byStatus.length === 0}
              emptyLabel="No employees yet."
            >
              <SegmentedBar
                slices={stats.byStatus}
                colors={STATUS_COLORS}
                headline={
                  <>
                    <span className="text-2xl font-semibold text-neutral-900 tabular-nums">
                      {formatPercent(stats.headcount > 0 ? stats.active / stats.headcount : 0)}
                    </span>{" "}
                    of the {stats.headcount} on file are active
                  </>
                }
              />
            </ChartCard>
            <ChartCard
              title="Length of Service"
              caption="Active people, counted from their date of joining"
              empty={stats.byTenure.every((slice) => slice.count === 0)}
              emptyLabel="No joining dates on file yet."
            >
              <ColumnChart slices={stats.byTenure} label="Active people by length of service" />
            </ChartCard>
            <ChartCard
              title="Age"
              caption="Active people with a date of birth and gender on file"
              empty={stats.byAgeAndGender.every((band) => band.male + band.female === 0)}
              emptyLabel="No dates of birth on file yet."
            >
              <AgePyramid bands={stats.byAgeAndGender} />
            </ChartCard>
            <ChartCard
              title="Hiring by Year"
              caption="Everyone on file, by the year they joined"
              empty={stats.byHireYear.every((slice) => slice.count === 0)}
              emptyLabel="No joining dates on file yet."
            >
              <TrendChart slices={stats.byHireYear} label="People hired per year" />
            </ChartCard>
            <ChartCard
              title="Gender"
              caption="Active people who have it on file"
              empty={stats.byGender.length === 0}
              emptyLabel="No gender on file yet."
            >
              <WaffleChart
                slices={stats.byGender}
                colors={GENDER_COLORS}
                label="Active people by gender"
              />
            </ChartCard>
          </div>
        </section>
      </div>
    </>
  )
}

export default async function HrDashboardPage() {
  await requirePermission("employees.manage")

  return (
    <>
      <Topbar title="Dashboard" section={null} />

      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
        <Suspense fallback={<DashboardFallback />}>
          <HrFigures />
        </Suspense>
      </main>
    </>
  )
}

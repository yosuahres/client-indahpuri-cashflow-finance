import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { Topbar } from "@/components/layout/topbar"
import { CARD_ACTION_CLASS } from "@/components/ui/card"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/features/auth/session"
import { BreakdownList } from "@/features/employees/components/breakdown-list"
import { StatTiles } from "@/features/employees/components/stat-tiles"
import { loadHrStats } from "@/features/employees/dashboard"
import { formatCurrency } from "@/lib/format"

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
            <BreakdownList
              title="By Employment Status"
              caption="Active people, per contract type"
              slices={stats.byEmploymentType}
              emptyLabel="No active employees yet."
            />
            <BreakdownList
              title="By Status"
              caption="Everyone on file, active or not"
              slices={stats.byStatus}
              emptyLabel="No employees yet."
            />
            <BreakdownList
              title="Length of Service"
              caption="Active people, counted from their date of joining"
              slices={stats.byTenure}
              emptyLabel="No joining dates on file yet."
            />
            <BreakdownList
              title="Age"
              caption="Active people, counted from their date of birth"
              slices={stats.byAge}
              emptyLabel="No dates of birth on file yet."
            />
            <BreakdownList
              title="Hiring by Year"
              caption="Everyone on file, by the year they joined"
              slices={stats.byHireYear}
              emptyLabel="No joining dates on file yet."
            />
            <BreakdownList
              title="Gender"
              caption="Active people who have it on file"
              slices={stats.byGender}
              emptyLabel="No gender on file yet."
            />
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

import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"

import { Topbar } from "@/components/layout/topbar"
import { CARD_ACTION_CLASS } from "@/components/ui/card"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/features/auth/session"
import { StatTiles } from "@/features/employees/components/stat-tiles"
import { MoneyBreakdown } from "@/features/payroll/components/money-breakdown"
import { MonthPicker } from "@/features/payroll/components/month-picker"
import { NetPayTrend } from "@/features/payroll/components/net-pay-trend"
import { loadPayrollDashboard } from "@/features/payroll/dashboard"
import { firstDayOfMonth, longMonthName, readReportMonth } from "@/features/reporting/months"
import { formatCurrency } from "@/lib/format"

export const metadata: Metadata = {
  title: "Payroll Dashboard",
}

function DashboardFallback() {
  return (
    <LoadingRegion label="Loading the payroll figures">
      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((tile) => (
            <Skeleton key={tile} className="h-[82px]" />
          ))}
        </div>
        <Skeleton className="h-[240px]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[240px]" />
          <Skeleton className="h-[240px]" />
        </div>
      </div>
    </LoadingRegion>
  )
}

async function PayrollFigures({ year, month }: { year: number; month: number }) {
  const { ok, error, dashboard } = await loadPayrollDashboard(year, month)
  const sheet = `/hris/payroll?year=${year}&month=${month}`
  const monthLabel = `${longMonthName(month)} ${year}`
  const ran = dashboard.status !== null

  return (
    <>
      {!ok ? (
        <p
          role="alert"
          className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-4 px-4 pt-3 pb-6 sm:px-6 sm:pt-4">
        {ok && !ran ? (
          <p className="text-sm text-neutral-500">
            No payroll saved for {monthLabel} yet.{" "}
            <Link href={sheet} className="font-medium text-neutral-900 underline underline-offset-2">
              Run it
            </Link>
          </p>
        ) : null}

        <StatTiles
          tiles={[
            {
              label: "Net Pay",
              value: formatCurrency(dashboard.netPay),
              description: ran
                ? `To ${dashboard.people} ${dashboard.people === 1 ? "person" : "people"}${dashboard.status === "draft" ? " · draft" : ""}`
                : "Not run yet",
            },
            {
              label: "Gross Pay",
              value: formatCurrency(dashboard.grossPay),
              description: "Before deductions",
            },
            {
              label: "Deductions",
              value: formatCurrency(dashboard.totalDeductions),
              description: "BPJS and other deductions",
            },
            {
              label: "Company Cost",
              value: formatCurrency(dashboard.companyCost),
              description: `Incl. ${formatCurrency(dashboard.employerBpjs)} company BPJS`,
            },
          ]}
        />

        <NetPayTrend trend={dashboard.trend} selected={firstDayOfMonth(year, month)} />

        <div className="grid gap-4 lg:grid-cols-2">
          <MoneyBreakdown
            title="Earnings"
            caption={`What gross pay was made of in ${monthLabel}.`}
            slices={dashboard.earnings}
            emptyLabel="Nothing paid this month yet."
            action={
              <Link href={sheet} className={CARD_ACTION_CLASS}>
                Open payroll
              </Link>
            }
          />
          <MoneyBreakdown
            title="Deductions"
            caption="What was taken off the pay."
            slices={dashboard.deductions}
            emptyLabel="Nothing taken off this month."
          />
        </div>

        <MoneyBreakdown
          title="Net Pay by Department"
          caption={`What each department took home in ${monthLabel}.`}
          slices={dashboard.netByDepartment}
          emptyLabel="Nothing paid this month yet."
        />
      </div>
    </>
  )
}

/** How pay stands for a month, and how it has moved over the year. */
export default async function PayrollDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("payroll.manage")
  const { year, month } = readReportMonth(await searchParams)
  const now = new Date()
  const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }

  return (
    <>
      <Topbar title="Dashboard" section={null} />

      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
        <div className="border-b border-black/8">
          <MonthPicker year={year} month={month} current={current} />
        </div>
        <Suspense key={`${year}-${month}`} fallback={<DashboardFallback />}>
          <PayrollFigures year={year} month={month} />
        </Suspense>
      </main>
    </>
  )
}

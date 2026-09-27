import type { Metadata } from "next"
import { Download } from "lucide-react"

import { TOPBAR_ACTION_CLASS, Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { MonthPicker } from "@/features/payroll/components/month-picker"
import { PayrollList } from "@/features/payroll/components/payroll-list"
import { loadPayrollMonth } from "@/features/payroll/data"
import { applyPayrollQuery, readPayrollQuery } from "@/features/payroll/query"
import { firstDayOfMonth, readReportMonth } from "@/features/reporting/months"

export const metadata: Metadata = {
  title: "Payroll",
}

/** One month's pay for everyone on the roll, from draft to final. */
export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("payroll.manage")
  const params = await searchParams

  const { year, month } = readReportMonth(params)
  const period = firstDayOfMonth(year, month)
  const now = new Date()
  const current = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }

  const payroll = await loadPayrollMonth(period)

  const departments = [
    ...new Set(payroll.employees.flatMap((employee) => employee.department ?? [])),
  ].sort((a, b) => a.localeCompare(b))
  const query = readPayrollQuery(params, departments)
  const shown = applyPayrollQuery(payroll.employees, query, {
    locked: payroll.run?.status === "final",
    payslips: payroll.payslips,
    workingDays: payroll.workingDays,
    rates: payroll.rates,
  })

  return (
    <>
      <Topbar
        title="Payroll"
        section={null}
        actions={
          payroll.run ? (
            // A plain link: the download is a file, not a page to route to.
            <a href={`/hris/payroll/export?year=${year}&month=${month}`} className={TOPBAR_ACTION_CLASS}>
              <Download className="size-4" strokeWidth={2} />
              <span className="hidden sm:inline">Export</span>
            </a>
          ) : null
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 border-b border-black/8">
          <MonthPicker year={year} month={month} current={current} />
        </div>

        {!payroll.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {payroll.error}
          </p>
        ) : null}

        {payroll.ok ? (
          <PayrollList
            period={period}
            run={payroll.run}
            employees={shown}
            workingDays={payroll.workingDays}
            payslips={payroll.payslips}
            rates={payroll.rates}
            departments={departments}
            query={query}
          />
        ) : null}
      </main>
    </>
  )
}

import { Suspense } from "react"
import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { LoadingRegion, Skeleton } from "@/components/ui/skeleton"
import { listAccounts } from "@/features/accounts/actions"
import { AccountPicker } from "@/features/reporting/components/account-picker"
import { FinancialReportTable } from "@/features/reporting/components/financial-report-table"
import { FitToFrame } from "@/features/reporting/components/fit-to-frame"
import { longMonthName, readReportMonth, stepMonth } from "@/features/reporting/months"
import { loadFinancialReport } from "@/features/reporting/report"

export const metadata: Metadata = {
  title: "Laporan Keuangan",
}

const stepper =
  "grid size-8 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 sm:size-7"

/** Holds the sheet's shape while the figures are on their way. */
function SheetFallback() {
  return (
    <LoadingRegion label="Loading the report">
      <div className="space-y-1.5 p-3 sm:p-4">
        {Array.from({ length: 16 }, (_, row) => (
          <Skeleton key={row} className="h-6" />
        ))}
      </div>
    </LoadingRegion>
  )
}

/**
 * The sheet itself. Everything around it — the title, the month stepper, the
 * export link — is sent as soon as the request arrives, and this replaces the
 * skeleton when the database answers.
 */
async function Sheet({
  year,
  month,
  account,
}: {
  year: number
  month: number
  account: string
}) {
  const { ok, error, report } = await loadFinancialReport({ year, month, account })

  return (
    <>
      {!ok ? (
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {error}
        </p>
      ) : null}
      <FinancialReportTable report={report} />
    </>
  )
}

/**
 * The account picker, behind its own boundary. The page's chrome goes out
 * before any query has answered, and reading the account list is a query like
 * any other — it must not be the thing that holds the first flush up.
 */
async function AccountControl({ account }: { account: string }) {
  const accounts = await listAccounts()
  return <AccountPicker accounts={accounts.accounts} account={account} />
}

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { year, month } = readReportMonth(params)

  const rawCompany = typeof params.company === "string" ? params.company.trim() : ""
  const company = rawCompany || "Indah Puri"
  const account = typeof params.account === "string" ? params.account.trim() : ""

  // Stepping months keeps whatever company and account the URL was carrying.
  const carried =
    (rawCompany ? `&company=${encodeURIComponent(rawCompany)}` : "") +
    (account ? `&account=${encodeURIComponent(account)}` : "")
  const previous = stepMonth(year, month, -1)
  const next = stepMonth(year, month, 1)
  const at = ({ year: y, month: m }: { year: number; month: number }) =>
    `/reporting?year=${y}&month=${m}${carried}`

  return (
    <>
      <Topbar
        title="Laporan Keuangan"
        section={null}
        actions={
          <a
            href={`/reporting/export?year=${year}&month=${month}${carried}`}
            aria-label="Export Excel"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-black/10 px-2.5 text-sm text-neutral-700 hover:border-black/20 hover:text-neutral-900 sm:h-8"
          >
            <Download className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden sm:inline">Export Excel</span>
          </a>
        }
      />

      {/* The sheet is meant to be read whole, so it shrinks to the window
          rather than running past the fold. */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:overflow-hidden">
        <FitToFrame className="flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 sm:gap-4 sm:px-4">
            <div>
              <h1 className="text-sm font-bold tracking-tight text-neutral-900">
                LAPORAN KEUANGAN {company.toUpperCase()}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-500">
                Periode Tahun {year} &mdash; Bulan {longMonthName(month).toUpperCase()}
                {account ? ` — Akun ${account}` : ""}
              </p>
            </div>

            {/* The two narrowings the sheet offers, side by side: which
                account it covers, and which month. */}
            <div className="flex flex-wrap items-center gap-2">
              <Suspense fallback={<Skeleton className="h-10 w-48" />}>
                <AccountControl account={account} />
              </Suspense>

              <nav
                aria-label="Pilih bulan"
                className="flex items-center gap-1 rounded-lg border border-black/10 px-1.5 py-1"
              >
                <Link href={at(previous)} aria-label="Bulan sebelumnya" className={stepper}>
                  <ChevronLeft className="size-4" strokeWidth={2} />
                </Link>
                <span className="flex items-center gap-1.5 px-1.5 text-sm text-neutral-900">
                  <CalendarDays className="size-4 text-neutral-400" strokeWidth={1.75} />
                  {longMonthName(month)} {year}
                </span>
                <Link href={at(next)} aria-label="Bulan berikutnya" className={stepper}>
                  <ChevronRight className="size-4" strokeWidth={2} />
                </Link>
              </nav>
            </div>
          </div>

          <div className="border-y border-black/10 lg:min-h-0 lg:flex-1">
            <Suspense key={`${year}-${month}-${account}`} fallback={<SheetFallback />}>
              <Sheet year={year} month={month} account={account} />
            </Suspense>
          </div>
        </FitToFrame>
      </main>
    </>
  )
}

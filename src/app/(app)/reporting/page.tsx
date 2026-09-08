import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { FinancialReportTable } from "@/features/reporting/components/financial-report-table"
import { longMonthName, readReportMonth, stepMonth } from "@/features/reporting/months"
import { loadFinancialReport } from "@/features/reporting/report"

export const metadata: Metadata = {
  title: "Laporan Keuangan",
}

const stepper =
  "grid size-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"

export default async function ReportingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { year, month } = readReportMonth(params)

  const { ok, error, report } = await loadFinancialReport({ year, month })

  const rawCompany = typeof params.company === "string" ? params.company.trim() : ""
  const company = rawCompany || "Indah Puri"

  // Stepping months keeps whatever company the URL was carrying.
  const carried = rawCompany ? `&company=${encodeURIComponent(rawCompany)}` : ""
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
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 px-2.5 text-sm text-neutral-700 hover:border-black/20 hover:text-neutral-900"
          >
            <Download className="size-4" strokeWidth={1.75} />
            Export Excel
          </a>
        }
      />

      <main className="min-h-0 flex-1 overflow-y-auto">
        {!ok ? (
          <p role="alert" className="border-b border-amber-200 bg-amber-50 px-6 py-3 text-sm text-amber-900">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
          <div>
            <h1 className="text-sm font-bold tracking-tight text-neutral-900">
              LAPORAN KEUANGAN {company.toUpperCase()}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              Periode Tahun {year} &mdash; Bulan {longMonthName(month).toUpperCase()}
            </p>
          </div>

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

        <div className="border-y border-black/10">
          <FinancialReportTable report={report} />
        </div>

        <p className="px-6 py-4 text-xs text-neutral-500">
          Kolom ANGGARAN diambil dari halaman Anggaran (rencana bulanan). Kolom AKTUAL
          dihitung otomatis dari transaksi cashflow. Angka dalam{" "}
          <span className="text-rose-600">(kurung merah)</span> berarti negatif.
        </p>
      </main>
    </>
  )
}

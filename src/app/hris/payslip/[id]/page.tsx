import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { requirePermission } from "@/features/auth/session"
import { employmentTypeLabel } from "@/features/employees/constants"
import { bpjsTkEmployee, type PayFigures } from "@/features/payroll/calculate"
import { PrintButton } from "@/features/payroll/components/print-button"
import { loadPayslip } from "@/features/payroll/data"
import { longMonthName } from "@/features/reporting/months"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/format"

export const metadata: Metadata = {
  title: "Payslip",
}

type SlipLine = { label: string; detail?: string; amount: number }

function Lines({ title, lines, total }: { title: string; lines: SlipLine[]; total: SlipLine }) {
  return (
    <section className="flex flex-col">
      <h2 className="border-b border-black/12 pb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
        {title}
      </h2>
      <dl className="flex flex-col">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-4 border-b border-black/5 py-2 text-sm">
            <dt className="text-neutral-700">
              {line.label}
              {line.detail ? <span className="block text-xs text-neutral-500">{line.detail}</span> : null}
            </dt>
            <dd className="text-neutral-900 tabular-nums">{formatCurrency(line.amount)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-4 py-2 text-sm font-semibold">
          <dt className="text-neutral-900">{total.label}</dt>
          <dd className="text-neutral-900 tabular-nums">{formatCurrency(total.amount)}</dd>
        </div>
      </dl>
    </section>
  )
}

function earnings(slip: PayFigures): SlipLine[] {
  const lines: SlipLine[] = [
    {
      label: "Gaji Pokok",
      detail:
        slip.dailyRate !== null
          ? `${slip.workingDays} hari × ${formatCurrency(slip.dailyRate)}`
          : undefined,
      amount: slip.basicSalary,
    },
    { label: "Tunjangan Tetap", amount: slip.fixedAllowance },
    { label: "THR", amount: slip.thr },
    { label: "Service Charge", amount: slip.serviceCharge },
    {
      label: "Uang Makan",
      detail: slip.workingDays > 0 ? `${slip.workingDays} hari kerja` : undefined,
      amount: slip.mealAllowance,
    },
    { label: "Tunjangan Lain", amount: slip.otherAllowance },
    { label: "Bonus", amount: slip.bonus },
  ]
  // Basic pay always shows; a one-off nobody got this month does not.
  return lines.filter((line, index) => index === 0 || line.amount > 0)
}

function deductions(slip: PayFigures): SlipLine[] {
  return [
    {
      label: "BPJS Ketenagakerjaan",
      detail: `JHT ${formatCurrency(slip.jhtEmployee)} · JP ${formatCurrency(slip.jpEmployee)}`,
      amount: bpjsTkEmployee(slip),
    },
    { label: "BPJS Kesehatan", amount: slip.bpjsKesEmployee },
    { label: "Potongan Lain", amount: slip.otherDeduction },
  ].filter((line) => line.amount > 0)
}

/** One person's payslip for one month, laid out to print on a single page. */
export default async function PayslipPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("payroll.manage")
  const { id } = await params
  const result = await loadPayslip(id)

  if (!result.ok && result.error) {
    return (
      <main className="min-h-0 flex-1 overflow-y-auto">
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {result.error}
        </p>
      </main>
    )
  }
  if (!result.ok) notFound()

  const { payslip: slip, period, status } = result
  const year = Number(period.slice(0, 4))
  const month = Number(period.slice(5, 7))
  const monthLabel = `${longMonthName(month)} ${year}`
  const deducted = deductions(slip)

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50 print:overflow-visible print:bg-white">
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between gap-2 border-b border-black/8 bg-white px-3 sm:px-5 print:hidden">
        <Link
          href={`/hris/payroll?year=${year}&month=${month}`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        >
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Payroll
        </Link>
        <PrintButton />
      </div>

      <article className="mx-auto my-4 max-w-2xl bg-white px-4 py-6 sm:my-8 sm:rounded-xl sm:border sm:border-black/10 sm:px-8 sm:py-8 print:my-0 print:border-0 print:px-0">
        <header className="flex flex-col gap-1 border-b border-black/12 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Indah Puri</p>
            <h1 className="mt-1 text-xl font-semibold text-neutral-900">Slip Gaji</h1>
            <p className="text-sm text-neutral-600">{monthLabel}</p>
          </div>
          {status === "draft" ? (
            <span className="self-start rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 sm:self-auto">
              Draft
            </span>
          ) : null}
        </header>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 border-b border-black/12 py-4 text-sm sm:grid-cols-2">
          {[
            ["Nama", slip.fullName],
            ["No. Karyawan", slip.employeeNo],
            ["Jabatan", result.position],
            ["Departemen", slip.department],
            ["Status", employmentTypeLabel(slip.employmentType)],
            ["Hari Kerja", `${slip.workingDays} hari`],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 sm:block">
              <dt className="text-neutral-500">{label}</dt>
              <dd className="text-neutral-900">{value || "—"}</dd>
            </div>
          ))}
        </dl>

        <div className="grid grid-cols-1 gap-6 py-5 sm:grid-cols-2">
          <Lines
            title="Pendapatan"
            lines={earnings(slip)}
            total={{ label: "Total Pendapatan", amount: slip.grossPay }}
          />
          <Lines
            title="Potongan"
            lines={deducted}
            total={{ label: "Total Potongan", amount: slip.totalDeductions }}
          />
        </div>

        <div
          className={cn(
            "flex items-baseline justify-between gap-4 rounded-lg bg-neutral-100 px-4 py-3 print:border print:border-black/20 print:bg-white",
          )}
        >
          <span className="text-sm font-semibold text-neutral-900">Gaji Bersih</span>
          <span className="text-lg font-semibold text-neutral-900 tabular-nums">
            {formatCurrency(slip.netPay)}
          </span>
        </div>

        {result.bankAccountNo ? (
          <p className="mt-3 text-sm text-neutral-600">
            Ditransfer ke {result.bankName ? `${result.bankName} ` : ""}
            {result.bankAccountNo}
            {result.bankAccountHolder ? ` a.n. ${result.bankAccountHolder}` : ""}
          </p>
        ) : null}

        {slip.note ? <p className="mt-3 text-sm text-neutral-600">{slip.note}</p> : null}
      </article>
    </main>
  )
}

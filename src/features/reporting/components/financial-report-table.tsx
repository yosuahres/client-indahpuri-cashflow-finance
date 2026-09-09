import { cn } from "@/lib/cn"
import type { FinancialReport, ReportColumns, ReportLine } from "../report"
import { longMonthName, monthColumnLabel } from "../months"

/** Plain thousands, no currency prefix — the statement is all one currency. */
const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 })

/** The monthly block is tinted so the eye can tell it from the period block. */
const MONTH_TINT = "bg-amber-50"

/**
 * Every rule in this table lives in the header. The body carries none at all —
 * banners and totals are marked by their fill instead. Inline rather than a
 * utility class so it cannot be lost to a class that never reached the sheet.
 */
const RULE = { borderLeft: "1px solid rgba(0, 0, 0, 0.10)" }

const cell = "px-2 py-1.5 text-right tabular-nums whitespace-nowrap sm:px-3"

/** The six figures, always in this order. Index 0 and 3 open a column block. */
const ORDER = [
  "monthBudget",
  "monthActual",
  "prevMonthActual",
  "yearBudget",
  "yearActual",
  "prevYearActual",
] as const satisfies readonly (keyof ReportColumns)[]

const isMonthly = (index: number) => index < 3

/** Column chrome, identical in the head, the body, the totals and the footer. */
function columnClass(index: number, options?: { tint?: boolean }) {
  return cn(options?.tint !== false && isMonthly(index) && MONTH_TINT)
}

/**
 * Zero reads as "nothing recorded" here, so it shows as a dash rather than a
 * column of noisy zeroes. Negatives take accounting parentheses.
 */
function Amount({ value }: { value: number }) {
  const rounded = Math.round(value)
  if (rounded === 0) return <span className="text-neutral-300">&ndash;</span>
  if (rounded < 0) {
    return <span className="text-rose-600">({rupiah.format(Math.abs(rounded))})</span>
  }
  return <>{rupiah.format(rounded)}</>
}

function Figures({
  columns,
  className,
  tint = true,
}: {
  columns: ReportColumns
  className?: string
  /** Off where the row's own background should run straight across. */
  tint?: boolean
}) {
  return (
    <>
      {ORDER.map((key, index) => (
        <td key={key} className={cn(cell, columnClass(index, { tint }), className)}>
          <Amount value={columns[key]} />
        </td>
      ))}
    </>
  )
}

/** A banner row carries no figures, so its background just runs across. */
function BlankCells() {
  return <td colSpan={ORDER.length} />
}

function SectionHeading({ letter, label }: { letter: string; label: string }) {
  return (
    <tr className="bg-blue-50 font-semibold text-blue-700">
      <td className="px-3 py-1.5 text-center">{letter}</td>
      <td className="px-3 py-1.5">{label}</td>
      <BlankCells />
    </tr>
  )
}

function TotalRow({ label, columns }: { label: string; columns: ReportColumns }) {
  return (
    <tr className="bg-neutral-100 font-semibold text-neutral-900">
      <td className="px-3 py-1.5" />
      <td className="px-3 py-1.5">{label}</td>
      <Figures columns={columns} />
    </tr>
  )
}

function EmptyRow({ label }: { label: string }) {
  return (
    <tr>
      <td className="px-3 py-4" />
      <td className="px-3 py-4 text-neutral-500">{label}</td>
      <BlankCells />
    </tr>
  )
}

function LineRows({ lines }: { lines: ReportLine[] }) {
  return (
    <>
      {lines.map((line, index) => (
        <tr key={line.label}>
          <td className="px-3 py-1.5 text-center text-xs text-neutral-400 tabular-nums">
            {index + 1}
          </td>
          <td className="px-3 py-1.5 text-neutral-800">{line.label}</td>
          <Figures columns={line} className="text-neutral-800" />
        </tr>
      ))}
    </>
  )
}

/** Two stacked header labels: the period on top, what it measures beneath. */
function ColumnHead({
  index,
  period,
  measure,
}: {
  index: number
  period: string
  measure: "ANGGARAN" | "AKTUAL"
}) {
  return (
    <th
      scope="col"
      style={RULE}
      className={cn(
        "min-w-[104px] px-2 pt-1.5 pb-2 text-right font-medium sm:min-w-[130px] sm:px-3",
        columnClass(index),
        !isMonthly(index) && "bg-neutral-50",
      )}
    >
      <span className="block text-neutral-800">{period}</span>
      <span
        className={cn(
          "block text-xs font-semibold",
          measure === "AKTUAL" ? "text-blue-600" : "text-neutral-500",
        )}
      >
        {measure}
      </span>
    </th>
  )
}

export function FinancialReportTable({ report }: { report: FinancialReport }) {
  const { year, month } = report
  const thisMonth = monthColumnLabel(year, month)
  const lastYearMonth = monthColumnLabel(year - 1, month)
  const period = longMonthName(month).toUpperCase()

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs sm:text-sm">
        <caption className="sr-only">
          Rencana dan realisasi pemasukan dan pengeluaran untuk {longMonthName(month)}{" "}
          {year}, dibandingkan tahun sebelumnya.
        </caption>

        <thead>
          <tr>
            <th
              scope="col"
              rowSpan={2}
              className="w-12 border-b border-black/10 px-3 py-2 text-center align-bottom font-semibold text-neutral-700"
            >
              NO
            </th>
            <th
              scope="col"
              rowSpan={2}
              className="min-w-[180px] border-b border-black/10 px-3 py-2 text-left align-bottom font-semibold text-neutral-700 sm:min-w-[280px]"
            >
              KETERANGAN
            </th>
            <th
              scope="colgroup"
              colSpan={3}
              style={RULE}
              className="border-y border-black/10 bg-amber-100 px-3 py-2 text-center font-bold tracking-wide text-amber-800"
            >
              BULANAN
            </th>
            <th
              scope="colgroup"
              colSpan={3}
              style={RULE}
              className="border-y border-black/10 bg-neutral-100 px-3 py-2 text-center font-bold tracking-wide text-neutral-700"
            >
              PERIODE (JAN &ndash; {period})
            </th>
          </tr>
          <tr className="border-b border-black/10">
            <ColumnHead index={0} period={thisMonth} measure="ANGGARAN" />
            <ColumnHead index={1} period={thisMonth} measure="AKTUAL" />
            <ColumnHead index={2} period={lastYearMonth} measure="AKTUAL" />
            <ColumnHead index={3} period={`THN ${year}`} measure="ANGGARAN" />
            <ColumnHead index={4} period={`THN ${year}`} measure="AKTUAL" />
            <ColumnHead index={5} period={`THN ${year - 1}`} measure="AKTUAL" />
          </tr>
        </thead>

        <tbody>
          <SectionHeading letter="A" label="PEMASUKAN" />
          <LineRows lines={report.income} />
          {report.income.length === 0 ? <EmptyRow label="Belum ada kategori pemasukan." /> : null}
          <TotalRow label="TOTAL PEMASUKAN" columns={report.incomeTotal} />

          <SectionHeading letter="B" label="PENGELUARAN" />
          <LineRows lines={report.expense} />
          {report.expense.length === 0 ? <EmptyRow label="Belum ada kategori pengeluaran." /> : null}
          <TotalRow label="TOTAL PENGELUARAN" columns={report.expenseTotal} />
        </tbody>

        <tfoot>
          <tr className="bg-amber-100 font-bold text-neutral-900">
            <td className="px-3 py-2" />
            <td className="px-3 py-2">DEVIASI PEMASUKAN / PENGELUARAN</td>
            <Figures columns={report.deviation} tint={false} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

import ExcelJS from "exceljs"

import { longMonthName, monthColumnLabel } from "./months"
import type { FinancialReport, ReportColumns, ReportLine } from "./report"

/** Thousands separators, negatives in red parentheses, blank instead of zero. */
const MONEY = "#,##0;[Red](#,##0);–"

const HEAD_FILL = "FFF3F3F1"
const MONTH_FILL = "FFFEF6E0"
const SECTION_FILL = "FFEAF2FE"
const TOTAL_FILL = "FFF0EFEC"
const DEVIATION_FILL = "FFFDF0C8"

function fill(cell: ExcelJS.Cell, argb: string) {
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb } }
}

/** One muted header-only column rule, matching the page. */
function rule(cell: ExcelJS.Cell, column: number) {
  if (column < 3) return
  cell.border = {
    ...cell.border,
    left: { style: "hair", color: { argb: "FFBFBEB9" } },
  }
}

/** The six figures, always in the same column order as the page. */
function figures(columns: ReportColumns) {
  return [
    columns.monthBudget,
    columns.monthActual,
    columns.prevMonthActual,
    columns.yearBudget,
    columns.yearActual,
    columns.prevYearActual,
  ]
}

/** Renders the Laporan Keuangan as a styled worksheet, ready to write out. */
export function buildReportWorkbook({
  report,
  company,
}: {
  report: FinancialReport
  company: string
}) {
  const { year, month } = report

  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(`${longMonthName(month)} ${year}`, {
    views: [{ state: "frozen", xSplit: 2, ySplit: 5 }],
  })

  sheet.columns = [
    { width: 5 },
    { width: 38 },
    ...Array.from({ length: 6 }, () => ({ width: 16 })),
  ]

  const title = sheet.addRow([`LAPORAN KEUANGAN ${company.toUpperCase()}`])
  title.font = { bold: true, size: 12 }
  sheet.mergeCells(title.number, 1, title.number, 8)

  const subtitle = sheet.addRow([
    `Periode Tahun ${year} — Bulan ${longMonthName(month).toUpperCase()}` +
      (report.account ? ` — Akun ${report.account}` : ""),
  ])
  subtitle.font = { color: { argb: "FF6B6A66" } }
  sheet.mergeCells(subtitle.number, 1, subtitle.number, 8)

  sheet.addRow([])

  const thisMonth = monthColumnLabel(year, month)
  const lastYearMonth = monthColumnLabel(year - 1, month)

  const groups = sheet.addRow([
    "NO",
    "KETERANGAN",
    "BULANAN",
    "",
    "",
    `PERIODE (JAN – ${longMonthName(month).toUpperCase()})`,
    "",
    "",
  ])
  const heads = sheet.addRow([
    "",
    "",
    `${thisMonth} ANGGARAN`,
    `${thisMonth} AKTUAL`,
    `${lastYearMonth} AKTUAL`,
    `THN ${year} ANGGARAN`,
    `THN ${year} AKTUAL`,
    `THN ${year - 1} AKTUAL`,
  ])

  sheet.mergeCells(groups.number, 1, heads.number, 1)
  sheet.mergeCells(groups.number, 2, heads.number, 2)
  sheet.mergeCells(groups.number, 3, groups.number, 5)
  sheet.mergeCells(groups.number, 6, groups.number, 8)

  for (const row of [groups, heads]) {
    row.font = { bold: true }
    row.alignment = { vertical: "middle", horizontal: "center", wrapText: true }
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      fill(cell, column >= 3 && column <= 5 ? MONTH_FILL : HEAD_FILL)
      cell.border = { bottom: { style: "thin" }, top: { style: "thin" } }
      rule(cell, column)
    })
  }
  heads.height = 30

  /** Every body row shares the money format and the monthly block tint. */
  const addFigureRow = (cells: (string | number)[], background?: string) => {
    const row = sheet.addRow(cells)
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      if (column >= 3) {
        cell.numFmt = MONEY
        cell.alignment = { horizontal: "right" }
      }
      if (background) fill(cell, background)
      else if (column >= 3 && column <= 5) fill(cell, MONTH_FILL)
    })
    return row
  }

  const addSection = (letter: string, label: string) => {
    const row = addFigureRow([letter, label], SECTION_FILL)
    row.font = { bold: true, color: { argb: "FF1D4ED8" } }
  }

  const addLines = (lines: ReportLine[]) => {
    lines.forEach((line, index) => {
      addFigureRow([index + 1, line.label, ...figures(line)])
    })
  }

  const addTotal = (label: string, columns: ReportColumns, background: string) => {
    const row = addFigureRow(["", label, ...figures(columns)], background)
    row.font = { bold: true }
  }

  addSection("A", "PEMASUKAN")
  addLines(report.income)
  addTotal("TOTAL PEMASUKAN", report.incomeTotal, TOTAL_FILL)

  addSection("B", "PENGELUARAN")
  addLines(report.expense)
  addTotal("TOTAL PENGELUARAN", report.expenseTotal, TOTAL_FILL)

  addTotal("DEVIASI PEMASUKAN / PENGELUARAN", report.deviation, DEVIATION_FILL)

  return workbook
}

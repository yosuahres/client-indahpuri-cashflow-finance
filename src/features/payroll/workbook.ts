import ExcelJS from "exceljs"

import { employmentTypeLabel } from "@/features/employees/constants"
import { longMonthName } from "@/features/reporting/months"

import { bpjsTkEmployee, employerBpjs } from "./calculate"
import type { Payslip } from "./data"

/** Thousands separators, blank instead of zero. */
const MONEY = "#,##0;[Red]-#,##0;–"
const HEAD_FILL = "FFF3F3F1"

export type PayrollExportRow = Payslip & { bankName: string | null; bankAccountNo: string | null }

const COLUMNS: { header: string; width: number; value: (row: PayrollExportRow) => string | number; money?: boolean }[] = [
  { header: "No. Karyawan", width: 14, value: (row) => row.employeeNo },
  { header: "Nama", width: 28, value: (row) => row.fullName },
  { header: "Departemen", width: 16, value: (row) => row.department ?? "" },
  { header: "Status", width: 13, value: (row) => employmentTypeLabel(row.employmentType) },
  { header: "Hari Kerja", width: 10, value: (row) => row.workingDays },
  { header: "Gaji Pokok", width: 14, value: (row) => row.basicSalary, money: true },
  { header: "Tunjangan Tetap", width: 14, value: (row) => row.fixedAllowance, money: true },
  { header: "THR", width: 13, value: (row) => row.thr, money: true },
  { header: "Service Charge", width: 14, value: (row) => row.serviceCharge, money: true },
  { header: "Uang Makan", width: 13, value: (row) => row.mealAllowance, money: true },
  { header: "Tunjangan Lain", width: 14, value: (row) => row.otherAllowance, money: true },
  { header: "Bonus", width: 13, value: (row) => row.bonus, money: true },
  { header: "Total Pendapatan", width: 15, value: (row) => row.grossPay, money: true },
  { header: "BPJS TK", width: 12, value: (row) => bpjsTkEmployee(row), money: true },
  { header: "BPJS Kes", width: 12, value: (row) => row.bpjsKesEmployee, money: true },
  { header: "Potongan Lain", width: 13, value: (row) => row.otherDeduction, money: true },
  { header: "Gaji Bersih", width: 15, value: (row) => row.netPay, money: true },
  { header: "BPJS Perusahaan", width: 15, value: (row) => employerBpjs(row), money: true },
  { header: "Bank", width: 12, value: (row) => row.bankName ?? "" },
  { header: "No. Rekening", width: 18, value: (row) => row.bankAccountNo ?? "" },
]

/** The month's payroll as a worksheet, one row a payslip and a total at the foot. */
export function buildPayrollWorkbook({
  year,
  month,
  final,
  rows,
}: {
  year: number
  month: number
  final: boolean
  rows: PayrollExportRow[]
}) {
  const workbook = new ExcelJS.Workbook()
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(`${longMonthName(month)} ${year}`, {
    views: [{ state: "frozen", xSplit: 2, ySplit: 4 }],
  })
  sheet.columns = COLUMNS.map((column) => ({ width: column.width }))

  const title = sheet.addRow([`DAFTAR GAJI — ${longMonthName(month).toUpperCase()} ${year}`])
  title.font = { bold: true, size: 12 }
  sheet.mergeCells(title.number, 1, title.number, COLUMNS.length)

  const subtitle = sheet.addRow([final ? "Final" : "Draft — belum final"])
  subtitle.font = { color: { argb: final ? "FF6B6A66" : "FFB45309" } }
  sheet.mergeCells(subtitle.number, 1, subtitle.number, COLUMNS.length)

  sheet.addRow([])

  const head = sheet.addRow(COLUMNS.map((column) => column.header))
  head.font = { bold: true }
  head.alignment = { vertical: "middle", wrapText: true }
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } }
  })

  for (const row of rows) {
    const line = sheet.addRow(COLUMNS.map((column) => column.value(row)))
    COLUMNS.forEach((column, index) => {
      if (column.money) line.getCell(index + 1).numFmt = MONEY
    })
  }

  const totals = sheet.addRow(
    COLUMNS.map((column, index) =>
      index === 1
        ? "TOTAL"
        : column.money
          ? rows.reduce((sum, row) => sum + Number(column.value(row)), 0)
          : "",
    ),
  )
  totals.font = { bold: true }
  totals.eachCell((cell, index) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEAD_FILL } }
    if (COLUMNS[index - 1]?.money) cell.numFmt = MONEY
  })

  return workbook
}

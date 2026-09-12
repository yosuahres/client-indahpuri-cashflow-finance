import { requireUser } from "@/features/auth/session"
import { readReportMonth, readSettlementFilter } from "@/features/reporting/months"
import { loadFinancialReport } from "@/features/reporting/report"
import { buildReportWorkbook } from "@/features/reporting/workbook"

export async function GET(request: Request) {
  // Route handlers are not covered by the page DAL, so re-verify here.
  await requireUser()

  const url = new URL(request.url)
  const { year, month } = readReportMonth(Object.fromEntries(url.searchParams))
  const company = url.searchParams.get("company")?.trim() || "Indah Puri"
  const account = url.searchParams.get("account")?.trim() || ""
  const params = Object.fromEntries(url.searchParams)
  const incomeStatus = readSettlementFilter(params, "incomeStatus")
  const expenseStatus = readSettlementFilter(params, "expenseStatus")

  const { report } = await loadFinancialReport({
    year,
    month,
    account,
    incomeStatus,
    expenseStatus,
  })
  const workbook = buildReportWorkbook({ report, company })

  const buffer = await workbook.xlsx.writeBuffer()
  // An account name can carry spaces and punctuation a filename should not.
  const slug = account.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  const filename =
    `laporan-keuangan-${year}-${String(month).padStart(2, "0")}` +
    `${slug ? `-${slug}` : ""}.xlsx`

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

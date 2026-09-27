import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { PAYSLIP_COLUMNS, payrollError, toPayslip } from "@/features/payroll/data"
import { buildPayrollWorkbook } from "@/features/payroll/workbook"
import { firstDayOfMonth, readReportMonth } from "@/features/reporting/months"

export async function GET(request: Request) {
  // Route handlers are not covered by the page DAL, so re-verify here.
  await requirePermission("payroll.manage")

  const url = new URL(request.url)
  const { year, month } = readReportMonth(Object.fromEntries(url.searchParams))

  const supabase = await createClient()
  const { data: run, error: runError } = await supabase
    .from("payroll_runs")
    .select("id, status")
    .eq("period", firstDayOfMonth(year, month))
    .maybeSingle()
  if (runError) return new Response(payrollError(runError), { status: 500 })
  if (!run) return new Response("There is no payroll for this month yet.", { status: 404 })

  const { data, error } = await supabase
    .from("payslips")
    .select(`${PAYSLIP_COLUMNS}, employees(bank_name, bank_account_no)`)
    .eq("run_id", run.id)
    .order("full_name")
  if (error) return new Response(payrollError(error), { status: 500 })

  const rows = ((data ?? []) as unknown as Record<string, unknown>[]).map((row) => {
    const bank = (Array.isArray(row.employees) ? row.employees[0] : row.employees) as
      | { bank_name?: string | null; bank_account_no?: string | null }
      | null
    return {
      ...toPayslip(row),
      bankName: bank?.bank_name ?? null,
      bankAccountNo: bank?.bank_account_no ?? null,
    }
  })

  const workbook = buildPayrollWorkbook({ year, month, final: run.status === "final", rows })
  const buffer = await workbook.xlsx.writeBuffer()
  const filename = `payroll-${year}-${String(month).padStart(2, "0")}.xlsx`

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

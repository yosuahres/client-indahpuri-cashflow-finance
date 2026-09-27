import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { firstDayOfMonth, stepMonth } from "@/features/reporting/months"

import { bpjsTkEmployee, employerBpjs } from "./calculate"
import { PAYSLIP_COLUMNS, payrollError, toPayslip, type RunStatus } from "./data"

/** One part of a rupiah whole: a pay line, a department. */
export type MoneySlice = { label: string; amount: number; share: number }

/** One month's run, for the trend. */
export type RunTotal = {
  /** `YYYY-MM-01`. */
  period: string
  /** Null for a month nobody has run payroll for. */
  status: RunStatus | null
  people: number
  grossPay: number
  netPay: number
  employerBpjs: number
}

export type PayrollDashboard = {
  status: RunStatus | null
  people: number
  grossPay: number
  totalDeductions: number
  netPay: number
  employerBpjs: number
  /** Gross pay plus the company's BPJS: what the month costs the business. */
  companyCost: number
  earnings: MoneySlice[]
  deductions: MoneySlice[]
  netByDepartment: MoneySlice[]
  /** The twelve months up to and including the one asked for, oldest first. */
  trend: RunTotal[]
}

export const EMPTY_PAYROLL_DASHBOARD: PayrollDashboard = {
  status: null,
  people: 0,
  grossPay: 0,
  totalDeductions: 0,
  netPay: 0,
  employerBpjs: 0,
  companyCost: 0,
  earnings: [],
  deductions: [],
  netByDepartment: [],
  trend: [],
}

const TREND_MONTHS = 12

/** Largest first, with the empty parts dropped, each carrying its share of the whole. */
function slices(parts: [string, number][]): MoneySlice[] {
  const whole = parts.reduce((sum, [, amount]) => sum + amount, 0)
  return parts
    .filter(([, amount]) => amount > 0)
    .map(([label, amount]) => ({ label, amount, share: whole > 0 ? amount / whole : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * The Payroll dashboard's figures for one month, from the payslips saved for
 * it, and the year leading up to it. A month not saved yet has nothing to
 * show: the dashboard reports what payroll holds, not what it would come to.
 */
export async function loadPayrollDashboard(year: number, month: number) {
  await requirePermission("payroll.manage")
  const supabase = await createClient()

  const period = firstDayOfMonth(year, month)
  const start = stepMonth(year, month, -(TREND_MONTHS - 1))
  const firstPeriod = firstDayOfMonth(start.year, start.month)

  const [runResult, totalsResult] = await Promise.all([
    supabase.from("payroll_runs").select("id, status").eq("period", period).maybeSingle(),
    supabase.rpc("payroll_run_totals", { first_period: firstPeriod, last_period: period }),
  ])

  const readError = runResult.error ?? totalsResult.error
  if (readError) {
    return { ok: false as const, error: payrollError(readError), dashboard: EMPTY_PAYROLL_DASHBOARD }
  }

  const saved = new Map(
    ((totalsResult.data ?? []) as Record<string, unknown>[]).map((row) => [
      String(row.period),
      {
        status: (row.status === "final" ? "final" : "draft") as RunStatus,
        people: Number(row.people),
        grossPay: Number(row.gross_pay),
        netPay: Number(row.net_pay),
        employerBpjs: Number(row.employer_bpjs),
      },
    ]),
  )
  // Every month in the window, so a month nobody ran shows as a gap.
  const trend: RunTotal[] = Array.from({ length: TREND_MONTHS }, (_, index) => {
    const at = stepMonth(start.year, start.month, index)
    const key = firstDayOfMonth(at.year, at.month)
    return {
      period: key,
      ...(saved.get(key) ?? { status: null, people: 0, grossPay: 0, netPay: 0, employerBpjs: 0 }),
    }
  })

  const run = runResult.data as { id: string; status: string } | null
  if (!run) return { ok: true as const, dashboard: { ...EMPTY_PAYROLL_DASHBOARD, trend } }

  const { data, error } = await supabase.from("payslips").select(PAYSLIP_COLUMNS).eq("run_id", run.id)
  if (error) {
    return { ok: false as const, error: payrollError(error), dashboard: { ...EMPTY_PAYROLL_DASHBOARD, trend } }
  }

  const payslips = ((data ?? []) as unknown as Record<string, unknown>[]).map(toPayslip)
  const sum = (pick: (slip: (typeof payslips)[number]) => number) =>
    payslips.reduce((total, slip) => total + pick(slip), 0)

  const byDepartment = new Map<string, number>()
  for (const slip of payslips) {
    const department = slip.department ?? "No department"
    byDepartment.set(department, (byDepartment.get(department) ?? 0) + slip.netPay)
  }

  const grossPay = sum((slip) => slip.grossPay)
  const companyBpjs = sum(employerBpjs)

  return {
    ok: true as const,
    dashboard: {
      status: run.status === "final" ? "final" : "draft",
      people: payslips.length,
      grossPay,
      totalDeductions: sum((slip) => slip.totalDeductions),
      netPay: sum((slip) => slip.netPay),
      employerBpjs: companyBpjs,
      companyCost: grossPay + companyBpjs,
      earnings: slices([
        ["Basic Salary", sum((slip) => slip.basicSalary)],
        ["Fixed Allowance", sum((slip) => slip.fixedAllowance)],
        ["THR", sum((slip) => slip.thr)],
        ["Service Charge", sum((slip) => slip.serviceCharge)],
        ["Meal Allowance", sum((slip) => slip.mealAllowance)],
        ["Other Allowances", sum((slip) => slip.otherAllowance)],
        ["Bonus", sum((slip) => slip.bonus)],
      ]),
      deductions: slices([
        ["BPJS Ketenagakerjaan", sum(bpjsTkEmployee)],
        ["BPJS Kesehatan", sum((slip) => slip.bpjsKesEmployee)],
        ["Other Deductions", sum((slip) => slip.otherDeduction)],
      ]),
      netByDepartment: slices([...byDepartment.entries()]),
      trend,
    } satisfies PayrollDashboard,
  }
}

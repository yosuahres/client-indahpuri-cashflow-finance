import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import type { EmploymentTypeValue } from "@/features/employees/constants"

import { DEFAULT_RATES, type PayBasis, type PayFigures, type PayrollRates } from "./calculate"

type Supabase = Awaited<ReturnType<typeof createClient>>

const UNDEFINED_TABLE = "42P01"
const UNDEFINED_COLUMN = "42703"
const UNDEFINED_FUNCTION = "PGRST202"

export const PAYROLL_MIGRATION_HINT =
  "Payroll is not set up yet. Run supabase/migrations/0032_payroll.sql against the project."

export function payrollError(error: { code?: string; message: string }) {
  return [UNDEFINED_TABLE, UNDEFINED_COLUMN, UNDEFINED_FUNCTION].includes(error.code ?? "")
    ? PAYROLL_MIGRATION_HINT
    : error.message
}

export type RunStatus = "draft" | "final"

export type PayrollRun = {
  id: string
  /** `YYYY-MM-01`. */
  period: string
  status: RunStatus
  finalizedAt: string | null
}

/** Someone on the payroll, with what their record says they are paid. */
export type PayrollEmployee = Omit<PayBasis, "workingDays"> & {
  id: string
  employeeNo: string
  fullName: string
  department: string | null
}

/** A payslip as saved: its own copy of who and what, whatever has changed since. */
export type Payslip = PayFigures & {
  id: string
  runId: string
  employeeId: string | null
  employeeNo: string
  fullName: string
  department: string | null
  employmentType: EmploymentTypeValue
  note: string | null
}

const SETTINGS_COLUMNS =
  "meal_allowance_per_day, bpjs_kes_employee_rate, bpjs_kes_employer_rate, bpjs_kes_wage_cap, " +
  "jht_employee_rate, jht_employer_rate, jp_employee_rate, jp_employer_rate, jp_wage_cap, " +
  "jkk_employer_rate, jkm_employer_rate"

export const EMPLOYEE_PAY_COLUMNS =
  "id, employee_no, full_name, department, employment_type, basic_salary, fixed_allowance, " +
  "daily_rate, bpjs_kesehatan, bpjs_ketenagakerjaan"

export const PAYSLIP_COLUMNS =
  "id, run_id, employee_id, employee_no, full_name, department, employment_type, working_days, " +
  "daily_rate, basic_salary, fixed_allowance, thr, service_charge, meal_allowance, " +
  "other_allowance, bonus, bpjs_kes_employee, jht_employee, jp_employee, other_deduction, " +
  "bpjs_kes_employer, jht_employer, jp_employer, jkk_employer, jkm_employer, gross_pay, " +
  "total_deductions, net_pay, note"

type Row = Record<string, unknown>

const num = (value: unknown) => Number(value ?? 0)
const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : null)

export function toRates(row: Row | null): PayrollRates {
  if (!row) return DEFAULT_RATES
  return {
    mealAllowancePerDay: num(row.meal_allowance_per_day),
    bpjsKesEmployeeRate: num(row.bpjs_kes_employee_rate),
    bpjsKesEmployerRate: num(row.bpjs_kes_employer_rate),
    bpjsKesWageCap: num(row.bpjs_kes_wage_cap),
    jhtEmployeeRate: num(row.jht_employee_rate),
    jhtEmployerRate: num(row.jht_employer_rate),
    jpEmployeeRate: num(row.jp_employee_rate),
    jpEmployerRate: num(row.jp_employer_rate),
    jpWageCap: num(row.jp_wage_cap),
    jkkEmployerRate: num(row.jkk_employer_rate),
    jkmEmployerRate: num(row.jkm_employer_rate),
  }
}

export function toPayrollEmployee(row: Row): PayrollEmployee {
  return {
    id: row.id as string,
    employeeNo: row.employee_no as string,
    fullName: row.full_name as string,
    department: text(row.department),
    employmentType: row.employment_type as EmploymentTypeValue,
    basicSalary: num(row.basic_salary),
    fixedAllowance: num(row.fixed_allowance),
    dailyRate: row.daily_rate == null ? null : num(row.daily_rate),
    bpjsKesehatan: Boolean(text(row.bpjs_kesehatan)),
    bpjsKetenagakerjaan: Boolean(text(row.bpjs_ketenagakerjaan)),
  }
}

export function toPayslip(row: Row): Payslip {
  return {
    id: row.id as string,
    runId: row.run_id as string,
    employeeId: (row.employee_id as string | null) ?? null,
    employeeNo: row.employee_no as string,
    fullName: row.full_name as string,
    department: text(row.department),
    employmentType: row.employment_type as EmploymentTypeValue,
    note: text(row.note),
    workingDays: num(row.working_days),
    dailyRate: row.daily_rate == null ? null : num(row.daily_rate),
    basicSalary: num(row.basic_salary),
    fixedAllowance: num(row.fixed_allowance),
    thr: num(row.thr),
    serviceCharge: num(row.service_charge),
    mealAllowance: num(row.meal_allowance),
    otherAllowance: num(row.other_allowance),
    bonus: num(row.bonus),
    bpjsKesEmployee: num(row.bpjs_kes_employee),
    jhtEmployee: num(row.jht_employee),
    jpEmployee: num(row.jp_employee),
    otherDeduction: num(row.other_deduction),
    bpjsKesEmployer: num(row.bpjs_kes_employer),
    jhtEmployer: num(row.jht_employer),
    jpEmployer: num(row.jp_employer),
    jkkEmployer: num(row.jkk_employer),
    jkmEmployer: num(row.jkm_employer),
    grossPay: num(row.gross_pay),
    totalDeductions: num(row.total_deductions),
    netPay: num(row.net_pay),
  }
}

export function toRun(row: Row): PayrollRun {
  return {
    id: row.id as string,
    period: row.period as string,
    status: row.status === "final" ? "final" : "draft",
    finalizedAt: (row.finalized_at as string | null) ?? null,
  }
}

/** The rates on file, or the statutory defaults before anyone has saved any. */
export async function readRates(supabase: Supabase) {
  const { data, error } = await supabase
    .from("payroll_settings")
    .select(SETTINGS_COLUMNS)
    .maybeSingle()
  return { rates: toRates(data as Row | null), error }
}

/** Days marked present or late in the month, keyed by employee id. */
export async function readWorkingDays(supabase: Supabase, period: string) {
  const { data, error } = await supabase.rpc("payroll_working_days", { period })
  const days: Record<string, number> = {}
  for (const row of (data ?? []) as { employee_id: string; days: number }[]) {
    days[row.employee_id] = Number(row.days)
  }
  return { days, error }
}

export async function loadPayrollRates() {
  await requirePermission("payroll.manage")
  const supabase = await createClient()
  const { rates, error } = await readRates(supabase)
  return { ok: !error, error: error ? payrollError(error) : undefined, rates }
}

export type PayrollMonth = {
  ok: boolean
  error?: string
  run: PayrollRun | null
  /** Saved payslips, keyed by employee id. Ones whose employee is gone are left out. */
  payslips: Record<string, Payslip>
  /** Everyone on the roll, plus anyone who has since left but is paid in this run. */
  employees: PayrollEmployee[]
  workingDays: Record<string, number>
  rates: PayrollRates
}

/** Everything the month's sheet needs, read at once. */
export async function loadPayrollMonth(period: string): Promise<PayrollMonth> {
  await requirePermission("payroll.manage")
  const supabase = await createClient()

  const [runResult, active, days, settings] = await Promise.all([
    supabase.from("payroll_runs").select("id, period, status, finalized_at").eq("period", period).maybeSingle(),
    supabase.from("employees").select(EMPLOYEE_PAY_COLUMNS).eq("status", "active").order("full_name"),
    readWorkingDays(supabase, period),
    readRates(supabase),
  ])

  const empty: PayrollMonth = {
    ok: false,
    run: null,
    payslips: {},
    employees: [],
    workingDays: {},
    rates: settings.rates,
  }

  const firstError = runResult.error ?? active.error ?? days.error ?? settings.error
  if (firstError) return { ...empty, error: payrollError(firstError) }

  const run = runResult.data ? toRun(runResult.data as Row) : null
  const employees = ((active.data ?? []) as unknown as Row[]).map(toPayrollEmployee)

  const payslips: Record<string, Payslip> = {}
  if (run) {
    const { data, error } = await supabase
      .from("payslips")
      .select(PAYSLIP_COLUMNS)
      .eq("run_id", run.id)
    if (error) return { ...empty, error: payrollError(error) }
    for (const row of (data ?? []) as unknown as Row[]) {
      const payslip = toPayslip(row)
      if (payslip.employeeId) payslips[payslip.employeeId] = payslip
    }

    // Someone paid in this run who has since left still belongs on its sheet.
    const onRoll = new Set(employees.map((employee) => employee.id))
    const missing = Object.keys(payslips).filter((id) => !onRoll.has(id))
    if (missing.length > 0) {
      const { data: gone, error: goneError } = await supabase
        .from("employees")
        .select(EMPLOYEE_PAY_COLUMNS)
        .in("id", missing)
      if (goneError) return { ...empty, error: payrollError(goneError) }
      employees.push(...((gone ?? []) as unknown as Row[]).map(toPayrollEmployee))
      employees.sort((a, b) => a.fullName.localeCompare(b.fullName))
    }
  }

  return { ok: true, run, payslips, employees, workingDays: days.days, rates: settings.rates }
}

/** One payslip with the month it pays for and where the money goes. */
export async function loadPayslip(id: string) {
  await requirePermission("payroll.manage")
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("payslips")
    .select(`${PAYSLIP_COLUMNS}, payroll_runs(period, status), employees(position, bank_name, bank_account_no, bank_account_holder)`)
    .eq("id", id)
    .maybeSingle()

  if (error) return { ok: false as const, error: payrollError(error) }
  if (!data) return { ok: false as const, error: null }

  const row = data as unknown as Row
  const one = (value: unknown) => (Array.isArray(value) ? value[0] : value) as Row | null | undefined
  const run = one(row.payroll_runs)
  const employee = one(row.employees)

  return {
    ok: true as const,
    payslip: toPayslip(row),
    period: (run?.period as string) ?? "",
    status: (run?.status === "final" ? "final" : "draft") as RunStatus,
    position: text(employee?.position),
    bankName: text(employee?.bank_name),
    bankAccountNo: text(employee?.bank_account_no),
    bankAccountHolder: text(employee?.bank_account_holder),
  }
}

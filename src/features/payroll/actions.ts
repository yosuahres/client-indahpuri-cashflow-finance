"use server"

import { refresh } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import { hasFieldErrors, type FormState } from "@/lib/form-state"

import { calculatePay, PAY_INPUTS, type PayFigures, type PayInputs, type PayrollRates } from "./calculate"
import {
  EMPLOYEE_PAY_COLUMNS,
  payrollError,
  readRates,
  readWorkingDays,
  toPayrollEmployee,
  toRun,
  type PayrollEmployee,
} from "./data"

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])-01$/
const AMOUNT = /^\d{1,15}$/

/** The row a payslip is stored as. The totals are the database's to add up. */
function payslipRow(runId: string, employee: PayrollEmployee, figures: PayFigures) {
  return {
    run_id: runId,
    employee_id: employee.id,
    employee_no: employee.employeeNo,
    full_name: employee.fullName,
    department: employee.department,
    employment_type: employee.employmentType,
    working_days: figures.workingDays,
    daily_rate: figures.dailyRate,
    basic_salary: figures.basicSalary,
    fixed_allowance: figures.fixedAllowance,
    thr: figures.thr,
    service_charge: figures.serviceCharge,
    meal_allowance: figures.mealAllowance,
    other_allowance: figures.otherAllowance,
    bonus: figures.bonus,
    bpjs_kes_employee: figures.bpjsKesEmployee,
    jht_employee: figures.jhtEmployee,
    jp_employee: figures.jpEmployee,
    other_deduction: figures.otherDeduction,
    bpjs_kes_employer: figures.bpjsKesEmployer,
    jht_employer: figures.jhtEmployer,
    jp_employer: figures.jpEmployer,
    jkk_employer: figures.jkkEmployer,
    jkm_employer: figures.jkmEmployer,
  }
}

/**
 * Saves the month's sheet, and with `intent=finalize` locks it too. Each row
 * comes in as an `employeeId` and its typed amounts, `thr:<id>` and so on; an
 * empty box is nothing. Salary, days worked and BPJS are not taken from the
 * form: they are read again here from the employee record, attendance and
 * Payroll Settings, so the payslip matches what is on file at the moment of
 * saving.
 */
export async function savePayroll(_prevState: FormState, formData: FormData): Promise<FormState> {
  const period = String(formData.get("period") ?? "")
  if (!PERIOD.test(period)) return { error: "Pick a valid month." }
  const finalize = formData.get("intent") === "finalize"

  const ids = [...new Set(formData.getAll("employeeId").map(String).filter(Boolean))]
  if (ids.length === 0) return { error: "There is nobody on the sheet to pay." }

  const fieldErrors: Record<string, string> = {}
  const inputs = new Map<string, PayInputs>()
  for (const id of ids) {
    const entry = { thr: 0, serviceCharge: 0, otherAllowance: 0, bonus: 0, otherDeduction: 0 }
    for (const { key } of PAY_INPUTS) {
      const raw = String(formData.get(`${key}:${id}`) ?? "").trim()
      if (!raw) continue
      if (!AMOUNT.test(raw)) {
        fieldErrors[`${key}:${id}`] = "Enter an amount in rupiah."
        continue
      }
      entry[key] = Number(raw)
    }
    inputs.set(id, entry)
  }
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  await requirePermission("payroll.manage")
  const supabase = await createClient()

  const [runResult, employeeResult, days, settings] = await Promise.all([
    supabase.from("payroll_runs").select("id, period, status, finalized_at").eq("period", period).maybeSingle(),
    supabase.from("employees").select(EMPLOYEE_PAY_COLUMNS).in("id", ids),
    readWorkingDays(supabase, period),
    readRates(supabase),
  ])
  const readError = runResult.error ?? employeeResult.error ?? days.error ?? settings.error
  if (readError) return { error: payrollError(readError) }

  let run = runResult.data ? toRun(runResult.data) : null
  if (run?.status === "final") return { error: "This payroll is final. Reopen it before changing it." }

  const employees = ((employeeResult.data ?? []) as unknown as Record<string, unknown>[]).map(
    toPayrollEmployee,
  )
  if (employees.length === 0) return { error: "None of the people on the sheet are on file any more." }

  if (!run) {
    const { data, error } = await supabase
      .from("payroll_runs")
      .insert({ period })
      .select("id, period, status, finalized_at")
      .single()
    if (error) return { error: payrollError(error) }
    run = toRun(data)
  }

  const runId = run.id
  const rates: PayrollRates = settings.rates
  const rows = employees.map((employee) =>
    payslipRow(
      runId,
      employee,
      calculatePay(
        { ...employee, workingDays: days.days[employee.id] ?? 0 },
        inputs.get(employee.id)!,
        rates,
      ),
    ),
  )

  const { error: saveError } = await supabase
    .from("payslips")
    .upsert(rows, { onConflict: "run_id,employee_id" })
  if (saveError) return { error: payrollError(saveError) }

  if (finalize) {
    const { error } = await supabase
      .from("payroll_runs")
      .update({ status: "final", finalized_at: new Date().toISOString() })
      .eq("id", runId)
    if (error) return { error: payrollError(error) }
  }

  refresh()
  return {
    message: finalize
      ? `Payroll finalized for ${rows.length} ${rows.length === 1 ? "person" : "people"}.`
      : `Payroll saved for ${rows.length} ${rows.length === 1 ? "person" : "people"}.`,
    savedAt: Date.now(),
  }
}

/** Takes a final run back to a draft, so its payslips can be changed again. */
export async function reopenPayroll(_prevState: FormState, formData: FormData): Promise<FormState> {
  const runId = String(formData.get("runId") ?? "")
  if (!runId) return { error: "There is no payroll to reopen." }

  await requirePermission("payroll.manage")
  const supabase = await createClient()
  const { error } = await supabase
    .from("payroll_runs")
    .update({ status: "draft", finalized_at: null })
    .eq("id", runId)
  if (error) return { error: payrollError(error) }

  refresh()
  return { message: "Payroll reopened as a draft.", savedAt: Date.now() }
}

const RATE = /^\d{1,3}(\.\d{1,2})?$/

const RATE_FIELDS = [
  ["bpjsKesEmployeeRate", "bpjs_kes_employee_rate"],
  ["bpjsKesEmployerRate", "bpjs_kes_employer_rate"],
  ["jhtEmployeeRate", "jht_employee_rate"],
  ["jhtEmployerRate", "jht_employer_rate"],
  ["jpEmployeeRate", "jp_employee_rate"],
  ["jpEmployerRate", "jp_employer_rate"],
  ["jkkEmployerRate", "jkk_employer_rate"],
  ["jkmEmployerRate", "jkm_employer_rate"],
] as const

const AMOUNT_FIELDS = [
  ["mealAllowancePerDay", "meal_allowance_per_day"],
  ["bpjsKesWageCap", "bpjs_kes_wage_cap"],
  ["jpWageCap", "jp_wage_cap"],
] as const

/**
 * Saves Payroll Settings. Only drafts and months not yet run pick the new
 * rates up; a final payroll keeps the figures it was paid on.
 */
export async function savePayrollSettings(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const fieldErrors: Record<string, string> = {}
  const row: Record<string, number | boolean> = { id: true }

  for (const [name, column] of RATE_FIELDS) {
    const raw = String(formData.get(name) ?? "").trim()
    if (!RATE.test(raw) || Number(raw) > 100) {
      fieldErrors[name] = "A percentage from 0 to 100, like 1 or 0.24."
      continue
    }
    row[column] = Number(raw)
  }
  for (const [name, column] of AMOUNT_FIELDS) {
    const raw = String(formData.get(name) ?? "").trim()
    if (!AMOUNT.test(raw)) {
      fieldErrors[name] = "Enter an amount in rupiah."
      continue
    }
    row[column] = Number(raw)
  }
  if (hasFieldErrors(fieldErrors)) return { fieldErrors }

  await requirePermission("payroll.manage")
  const supabase = await createClient()
  const { error } = await supabase
    .from("payroll_settings")
    .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: "id" })
  if (error) return { error: payrollError(error) }

  refresh()
  return { message: "Payroll settings saved.", savedAt: Date.now() }
}

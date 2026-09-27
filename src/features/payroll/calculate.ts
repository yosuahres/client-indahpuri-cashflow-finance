/**
 * The pay formula (gaji bersih), in one place. The sheet runs it as figures
 * are typed; the save runs it again on the server from what is on file, so
 * nothing the browser works out is trusted.
 *
 *   basic salary + fixed allowance + THR + service charge + meal allowance
 *   + other allowances + bonus
 *   − BPJS Ketenagakerjaan − BPJS Kesehatan − other deductions
 *   = net pay
 *
 * The database adds the lines up itself (0032 §4), so what is stored can never
 * disagree with this.
 */
import type { EmploymentTypeValue } from "@/features/employees/constants"

/** Payroll Settings. BPJS rates are percentages, as the law states them. */
export type PayrollRates = {
  mealAllowancePerDay: number
  bpjsKesEmployeeRate: number
  bpjsKesEmployerRate: number
  bpjsKesWageCap: number
  jhtEmployeeRate: number
  jhtEmployerRate: number
  jpEmployeeRate: number
  jpEmployerRate: number
  jpWageCap: number
  jkkEmployerRate: number
  jkmEmployerRate: number
}

/** The statutory rates, and Rp 4.000 a day for meals. Mirrors 0032 §1. */
export const DEFAULT_RATES: PayrollRates = {
  mealAllowancePerDay: 4000,
  bpjsKesEmployeeRate: 1,
  bpjsKesEmployerRate: 4,
  bpjsKesWageCap: 12_000_000,
  jhtEmployeeRate: 2,
  jhtEmployerRate: 3.7,
  jpEmployeeRate: 1,
  jpEmployerRate: 2,
  jpWageCap: 10_547_400,
  jkkEmployerRate: 0.24,
  jkmEmployerRate: 0.3,
}

/** What the employee record and attendance say about someone's pay this month. */
export type PayBasis = {
  employmentType: EmploymentTypeValue
  /** Per month. Not used for a daily worker. */
  basicSalary: number
  fixedAllowance: number
  /** Per day worked. Only used for a daily worker. */
  dailyRate: number | null
  /** Days marked present or late. */
  workingDays: number
  /** Enrolled when the record carries a membership number. */
  bpjsKesehatan: boolean
  bpjsKetenagakerjaan: boolean
}

/** What is typed in on the sheet each month. */
export type PayInputs = {
  thr: number
  serviceCharge: number
  otherAllowance: number
  bonus: number
  otherDeduction: number
}

export const PAY_INPUTS = [
  { key: "thr", label: "THR" },
  { key: "serviceCharge", label: "Service Charge" },
  { key: "otherAllowance", label: "Other Allowances" },
  { key: "bonus", label: "Bonus" },
  { key: "otherDeduction", label: "Other Deductions" },
] as const satisfies readonly { key: keyof PayInputs; label: string }[]

export const NO_INPUTS: PayInputs = {
  thr: 0,
  serviceCharge: 0,
  otherAllowance: 0,
  bonus: 0,
  otherDeduction: 0,
}

export type PayFigures = PayInputs & {
  workingDays: number
  dailyRate: number | null
  basicSalary: number
  fixedAllowance: number
  mealAllowance: number
  bpjsKesEmployee: number
  jhtEmployee: number
  jpEmployee: number
  bpjsKesEmployer: number
  jhtEmployer: number
  jpEmployer: number
  jkkEmployer: number
  jkmEmployer: number
  grossPay: number
  totalDeductions: number
  netPay: number
}

/** A percentage of an amount, to the whole rupiah. */
const share = (amount: number, percent: number) => Math.round((amount * percent) / 100)

export function calculatePay(basis: PayBasis, inputs: PayInputs, rates: PayrollRates): PayFigures {
  const daily = basis.employmentType === "daily_worker"
  const dailyRate = daily ? (basis.dailyRate ?? 0) : null
  const basicSalary = daily ? (dailyRate ?? 0) * basis.workingDays : basis.basicSalary
  const fixedAllowance = basis.fixedAllowance
  const mealAllowance = basis.workingDays * rates.mealAllowancePerDay

  // BPJS is taken from basic pay plus the fixed allowance, never the one-offs.
  const wage = basicSalary + fixedAllowance
  const kesWage = Math.min(wage, rates.bpjsKesWageCap)
  const jpWage = Math.min(wage, rates.jpWageCap)
  const kes = basis.bpjsKesehatan
  const tk = basis.bpjsKetenagakerjaan

  const bpjsKesEmployee = kes ? share(kesWage, rates.bpjsKesEmployeeRate) : 0
  const jhtEmployee = tk ? share(wage, rates.jhtEmployeeRate) : 0
  const jpEmployee = tk ? share(jpWage, rates.jpEmployeeRate) : 0

  const grossPay =
    basicSalary +
    fixedAllowance +
    inputs.thr +
    inputs.serviceCharge +
    mealAllowance +
    inputs.otherAllowance +
    inputs.bonus
  const totalDeductions = bpjsKesEmployee + jhtEmployee + jpEmployee + inputs.otherDeduction

  return {
    ...inputs,
    workingDays: basis.workingDays,
    dailyRate,
    basicSalary,
    fixedAllowance,
    mealAllowance,
    bpjsKesEmployee,
    jhtEmployee,
    jpEmployee,
    bpjsKesEmployer: kes ? share(kesWage, rates.bpjsKesEmployerRate) : 0,
    jhtEmployer: tk ? share(wage, rates.jhtEmployerRate) : 0,
    jpEmployer: tk ? share(jpWage, rates.jpEmployerRate) : 0,
    jkkEmployer: tk ? share(wage, rates.jkkEmployerRate) : 0,
    jkmEmployer: tk ? share(wage, rates.jkmEmployerRate) : 0,
    grossPay,
    totalDeductions,
    netPay: grossPay - totalDeductions,
  }
}

/** BPJS Ketenagakerjaan taken off the pay: JHT and JP together. */
export const bpjsTkEmployee = (figures: PayFigures) => figures.jhtEmployee + figures.jpEmployee

/** What BPJS costs the company on top of the pay. */
export const employerBpjs = (figures: PayFigures) =>
  figures.bpjsKesEmployer +
  figures.jhtEmployer +
  figures.jpEmployer +
  figures.jkkEmployer +
  figures.jkmEmployer

import "server-only"

import { createClient } from "@/lib/supabase/server"
import { requirePermission } from "@/features/auth/session"
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  type EmployeeStatusValue,
  type EmploymentTypeValue,
} from "./constants"

const UNDEFINED_TABLE = "42P01"
const UNDEFINED_COLUMN = "42703"

const MIGRATION_HINT =
  "The employees table does not exist yet. Run supabase/migrations/0017_employees.sql against the project."
const COLUMN_HINT =
  "Some employee columns do not exist yet. Run supabase/migrations/0018_employee_details.sql and 0023_employee_data_fields.sql against the project."

/** The columns the figures are counted from — nothing personal beyond them. */
const COLUMNS =
  "department, employment_type, status, gender, date_of_birth, join_date, basic_salary, fixed_allowance"

/** One slice of a breakdown: a label, how many people, and its share of them. */
export type Slice = { label: string; count: number; share: number }

export type HrStats = {
  /** Everyone on file, whatever their status. */
  headcount: number
  active: number
  /** Active people who joined in the calendar year the report is read in. */
  joinedThisYear: number
  /** Active people who left, were suspended or went inactive — the rest of the roll. */
  offRoll: number
  /** Basic salary plus fixed allowance, per month, for active people only. */
  monthlyPayroll: number
  /** How many active people carry a salary figure — the payroll's coverage. */
  salaryKnown: number
  byDepartment: Slice[]
  byEmploymentType: Slice[]
  byStatus: Slice[]
  byGender: Slice[]
  byTenure: Slice[]
  byAge: Slice[]
  /** People taken on per calendar year, most recent first. */
  byHireYear: Slice[]
}

export type HrStatsResult = {
  ok: boolean
  error?: string
  stats: HrStats
}

type Row = {
  department: string | null
  employment_type: EmploymentTypeValue
  status: EmployeeStatusValue
  gender: string | null
  date_of_birth: string | null
  join_date: string | null
  basic_salary: number | null
  fixed_allowance: number | null
}

const EMPTY: HrStats = {
  headcount: 0,
  active: 0,
  joinedThisYear: 0,
  offRoll: 0,
  monthlyPayroll: 0,
  salaryKnown: 0,
  byDepartment: [],
  byEmploymentType: [],
  byStatus: [],
  byGender: [],
  byTenure: [],
  byAge: [],
  byHireYear: [],
}

/** Counts per label as shares of `total`, so a bar can be drawn from each. */
function toSlices(counts: Map<string, number>, total: number): Slice[] {
  return [...counts].map(([label, count]) => ({
    label,
    count,
    share: total > 0 ? count / total : 0,
  }))
}

/** Biggest group first; ties fall back to the label so the order never wobbles. */
function bySize(slices: Slice[]): Slice[] {
  return [...slices].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

/**
 * Counts against a fixed list of labels, kept in that list's order and with
 * the empty ones dropped — an employment type nobody holds is not a bar.
 */
function tally(rows: Row[], labels: string[], of: (row: Row) => string | null): Slice[] {
  const counts = new Map(labels.map((label) => [label, 0]))
  let total = 0
  for (const row of rows) {
    const label = of(row)
    if (label === null || !counts.has(label)) continue
    counts.set(label, (counts.get(label) ?? 0) + 1)
    total += 1
  }
  return toSlices(counts, total).filter((slice) => slice.count > 0)
}

/** Whole years between an ISO date and today, or null when the date is unusable. */
function yearsSince(value: string | null, today: Date): number | null {
  if (!value) return null
  const then = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(then.getTime())) return null

  let years = today.getUTCFullYear() - then.getUTCFullYear()
  const month = today.getUTCMonth() - then.getUTCMonth()
  if (month < 0 || (month === 0 && today.getUTCDate() < then.getUTCDate())) years -= 1
  return years < 0 ? null : years
}

/** The band a number of years falls in, given each band's upper bound. */
function band(years: number, bands: { label: string; under: number }[]): string {
  return bands.find((entry) => years < entry.under)?.label ?? bands[bands.length - 1].label
}

const TENURE_BANDS = [
  { label: "Under 1 year", under: 1 },
  { label: "1–2 years", under: 3 },
  { label: "3–4 years", under: 5 },
  { label: "5+ years", under: Infinity },
]

/** How many years of hiring the trend goes back. */
const HIRE_YEARS = 5

const AGE_BANDS = [
  { label: "Under 25", under: 25 },
  { label: "25–34", under: 35 },
  { label: "35–44", under: 45 },
  { label: "45+", under: Infinity },
]

function summarize(rows: Row[], today: Date): HrStats {
  const active = rows.filter((row) => row.status === "active")
  const year = today.getUTCFullYear()

  const departments = new Map<string, number>()
  for (const row of active) {
    // Someone with no department still counts towards the headcount.
    const label = row.department?.trim() || "Unassigned"
    departments.set(label, (departments.get(label) ?? 0) + 1)
  }

  const tenures = new Map<string, number>(TENURE_BANDS.map((entry) => [entry.label, 0]))
  let tenureKnown = 0
  const ages = new Map<string, number>(AGE_BANDS.map((entry) => [entry.label, 0]))
  let ageKnown = 0

  for (const row of active) {
    const tenure = yearsSince(row.join_date, today)
    if (tenure !== null) {
      const label = band(tenure, TENURE_BANDS)
      tenures.set(label, (tenures.get(label) ?? 0) + 1)
      tenureKnown += 1
    }

    const age = yearsSince(row.date_of_birth, today)
    if (age !== null) {
      const label = band(age, AGE_BANDS)
      ages.set(label, (ages.get(label) ?? 0) + 1)
      ageKnown += 1
    }
  }

  // Everyone on file, not just the active ones: someone who has since left
  // was still a hire in the year they joined.
  const hires = new Map<string, number>()
  let hiresKnown = 0
  for (const row of rows) {
    const joined = row.join_date?.slice(0, 4)
    if (!joined || Number(joined) > year || Number(joined) <= year - HIRE_YEARS) continue
    hires.set(joined, (hires.get(joined) ?? 0) + 1)
    hiresKnown += 1
  }

  const salaried = active.filter(
    (row) => row.basic_salary !== null || row.fixed_allowance !== null,
  )

  return {
    headcount: rows.length,
    active: active.length,
    joinedThisYear: active.filter((row) => row.join_date?.startsWith(String(year))).length,
    offRoll: rows.length - active.length,
    monthlyPayroll: salaried.reduce(
      (total, row) => total + (row.basic_salary ?? 0) + (row.fixed_allowance ?? 0),
      0,
    ),
    salaryKnown: salaried.length,
    byDepartment: bySize(toSlices(departments, active.length)),
    byEmploymentType: tally(active, EMPLOYMENT_TYPES.map((type) => type.label), (row) =>
      EMPLOYMENT_TYPES.find((type) => type.value === row.employment_type)?.label ?? null,
    ),
    // Every status, not just the active ones this page mostly counts.
    byStatus: tally(rows, EMPLOYEE_STATUSES.map((status) => status.label), (row) =>
      EMPLOYEE_STATUSES.find((status) => status.value === row.status)?.label ?? null,
    ),
    byGender: tally(active, ["Male", "Female"], (row) => row.gender),
    // Bands stay in order and keep their zeroes, so the scale reads as a scale.
    byTenure: toSlices(tenures, tenureKnown),
    byAge: toSlices(ages, ageKnown),
    // Newest year first, and a year nobody joined in is left out rather than
    // drawn as an empty bar.
    byHireYear: toSlices(hires, hiresKnown).sort((a, b) => b.label.localeCompare(a.label)),
  }
}

/** Every figure the HR dashboard shows, counted in one pass over the roll. */
export async function loadHrStats(): Promise<HrStatsResult> {
  await requirePermission("employees.manage")

  const supabase = await createClient()
  const { data, error } = await supabase.from("employees").select(COLUMNS)

  if (error) {
    const hint =
      error.code === UNDEFINED_TABLE
        ? MIGRATION_HINT
        : error.code === UNDEFINED_COLUMN
          ? COLUMN_HINT
          : error.message
    return { ok: false, error: hint, stats: EMPTY }
  }

  return { ok: true, stats: summarize((data ?? []) as unknown as Row[], new Date()) }
}

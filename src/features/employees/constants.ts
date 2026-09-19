export type EmploymentTypeValue = "pkwtt" | "pkwt" | "daily_worker" | "consultant"

export const EMPLOYMENT_TYPES: { value: EmploymentTypeValue; label: string }[] = [
  { value: "pkwtt", label: "PKWTT" },
  { value: "pkwt", label: "PKWT" },
  { value: "daily_worker", label: "Daily Worker" },
  { value: "consultant", label: "Consultant" },
]

export type EmployeeStatusValue = "active" | "inactive" | "suspended" | "left"

export const EMPLOYEE_STATUSES: { value: EmployeeStatusValue; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
  { value: "left", label: "Left" },
]

export function employmentTypeLabel(value: EmploymentTypeValue) {
  return EMPLOYMENT_TYPES.find((type) => type.value === value)?.label ?? value
}

export function employeeStatusLabel(value: EmployeeStatusValue) {
  return EMPLOYEE_STATUSES.find((status) => status.value === value)?.label ?? value
}

/** Private storage bucket for employee photos, keyed `<employee id>/<file>`. */
export const PHOTO_BUCKET = "employee-photos"

/** Mirrors the bucket's own limits (0019), so a bad file is refused before upload. */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024

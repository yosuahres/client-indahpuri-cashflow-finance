import { EMPLOYEE_FIELDS, type EmployeeField, type EmployeeValues } from "./fields"

export function readEmployee(formData: FormData): EmployeeValues {
  return Object.fromEntries(
    EMPLOYEE_FIELDS.map((field) => [field.name, String(formData.get(field.name) ?? "").trim()]),
  )
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function checkField(field: EmployeeField, value: string): string | null {
  if (!value) return field.required ? `${field.label} is required.` : null

  switch (field.type) {
    case "text":
    case "department":
      return value.length > 200 ? `Keep ${field.label} under 200 characters.` : null
    // The dropdown only offers real shifts; the foreign key is what actually
    // enforces it, so this only catches a value that could never be one.
    case "shift":
      return UUID.test(value) ? null : "Choose a shift."
    case "date":
      return ISO_DATE.test(value) ? null : "Pick a valid date."
    case "money":
      return /^\d{1,15}$/.test(value) ? null : "Enter an amount in rupiah."
    case "choice":
      return field.options?.some((option) => option.value === value)
        ? null
        : `Choose a ${field.label.toLowerCase()}.`
  }
}

/** Field errors keyed by field name. */
export function validateEmployee(values: EmployeeValues) {
  const errors: Record<string, string> = {}

  for (const field of EMPLOYEE_FIELDS) {
    const error = checkField(field, values[field.name] ?? "")
    if (error) errors[field.name] = error
  }

  return errors
}

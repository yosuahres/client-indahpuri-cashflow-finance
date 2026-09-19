/**
 * Every field on an employee, grouped the way the form shows them: tabs, then
 * sections, then fields. The form, validation and the database mapping all
 * read from here, so adding a field is one entry plus its column in a
 * migration.
 *
 * The fields are the business's employee data sheet ("Data Karyawan"), with
 * the identity and tax numbers an Indonesian payroll needs (NIK, NPWP, PTKP,
 * BPJS).
 */
import { EMPLOYEE_STATUSES, EMPLOYMENT_TYPES } from "./constants"

type Option = { value: string; label: string }

export type FieldType =
  | "text"
  | "date"
  | "money"
  | "choice"
  /** One of the departments set up under Setup, stored by name. */
  | "department"
  /** One of the shifts set up under Shift & Attendance, stored by id. */
  | "shift"

export type EmployeeField = {
  name: string
  column: string
  label: string
  type: FieldType
  required?: boolean
  options?: Option[]
  placeholder?: string
  hint?: string
}

export type EmployeeSection = { title: string; fields: EmployeeField[] }

export type EmployeeTab = { key: string; label: string; sections: EmployeeSection[] }

const choices = (...labels: string[]): Option[] =>
  labels.map((label) => ({ value: label, label }))

export const EMPLOYEE_TABS: EmployeeTab[] = [
  {
    key: "overview",
    label: "Overview",
    sections: [
      {
        title: "Basic Information",
        fields: [
          { name: "employeeNo", column: "employee_no", label: "Employee ID", type: "text", required: true, placeholder: "e.g. EMP-001", hint: "Unique for each employee." },
          { name: "fullName", column: "full_name", label: "Full Name", type: "text", required: true, placeholder: "e.g. Budi Santoso" },
          { name: "gender", column: "gender", label: "Gender", type: "choice", options: choices("Male", "Female") },
          { name: "dateOfBirth", column: "date_of_birth", label: "Date of Birth", type: "date" },
          { name: "status", column: "status", label: "Status", type: "choice", required: true, options: EMPLOYEE_STATUSES },
        ],
      },
      {
        title: "Company",
        fields: [
          { name: "position", column: "position", label: "Designation", type: "text", placeholder: "e.g. Front Office Staff" },
          { name: "department", column: "department", label: "Department", type: "department" },
          { name: "grade", column: "grade", label: "Level", type: "text", placeholder: "e.g. Staff, Supervisor" },
          { name: "joinDate", column: "join_date", label: "Date of Joining", type: "date" },
          { name: "employmentType", column: "employment_type", label: "Employment Status", type: "choice", required: true, options: EMPLOYMENT_TYPES },
        ],
      },
    ],
  },
  {
    key: "attendance",
    label: "Attendance",
    sections: [
      {
        title: "Shift",
        fields: [
          {
            name: "shift",
            column: "shift_id",
            label: "Shift",
            type: "shift",
          },
        ],
      },
    ],
  },
  {
    key: "personal",
    label: "Personal Details",
    sections: [
      {
        title: "Identity",
        fields: [
          { name: "nik", column: "nik", label: "NIK (KTP)", type: "text", placeholder: "16 digits" },
          { name: "religion", column: "religion", label: "Religion", type: "choice", options: choices("Islam", "Christian", "Catholic", "Hindu", "Buddhist", "Konghucu") },
          { name: "educationLevel", column: "education_level", label: "Highest Education", type: "text", placeholder: "e.g. S1 Akuntansi" },
        ],
      },
    ],
  },
  {
    key: "salary",
    label: "Salary",
    sections: [
      {
        title: "Salary",
        fields: [
          { name: "basicSalary", column: "basic_salary", label: "Basic Salary", type: "money", hint: "Per month." },
          { name: "fixedAllowance", column: "fixed_allowance", label: "Fixed Allowance", type: "money", hint: "Per month." },
          { name: "bankAccountNo", column: "bank_account_no", label: "Bank Account No.", type: "text" },
        ],
      },
      {
        title: "Tax & Social Security",
        fields: [
          { name: "npwp", column: "npwp", label: "NPWP", type: "text" },
          {
            name: "ptkpStatus",
            column: "ptkp_status",
            label: "Family Status (PTKP)",
            type: "choice",
            options: choices("TK", "TK/0", "TK/1", "TK/2", "TK/3", "K/0", "K/1", "K/2", "K/3"),
            hint: "Decides the non-taxable income for PPh 21.",
          },
          { name: "bpjsKesehatan", column: "bpjs_kesehatan", label: "BPJS Kesehatan No.", type: "text" },
          { name: "bpjsKetenagakerjaan", column: "bpjs_ketenagakerjaan", label: "BPJS Ketenagakerjaan No.", type: "text" },
        ],
      },
    ],
  },
]

export const EMPLOYEE_FIELDS: EmployeeField[] = EMPLOYEE_TABS.flatMap((tab) =>
  tab.sections.flatMap((section) => section.fields),
)

/** Every field's value as the form holds it: text, empty for nothing on file. */
export type EmployeeValues = Record<string, string>

/** One employee, opened for its details. */
export type EmployeeRecord = {
  id: string
  fullName: string
  employeeNo: string
  /** Signed link to their photo, or null when none is uploaded. */
  photoUrl: string | null
  values: EmployeeValues
}

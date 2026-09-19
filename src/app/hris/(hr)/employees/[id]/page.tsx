import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requirePermission } from "@/features/auth/session"
import { listDepartments } from "@/features/departments/actions"
import { getEmployee } from "@/features/employees/actions"
import { EmployeeForm } from "@/features/employees/components/employee-form"
import { openOn } from "@/features/employees/open-on"
import { listShifts } from "@/features/shifts/actions"

export const metadata: Metadata = {
  title: "Employee Details",
}

/** One employee's details, editable in place. */
export default async function EmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("employees.manage")
  const [{ id }, query] = await Promise.all([params, searchParams])
  const [result, departments, shifts] = await Promise.all([
    getEmployee(id),
    listDepartments(),
    listShifts(),
  ])

  if (!result.ok) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {result.error}
        </p>
      </div>
    )
  }
  if (!result.employee) notFound()

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <EmployeeForm
        employee={result.employee}
        departments={departments.departments.map((department) => department.name)}
        // Back from adding a department, with it picked.
        preset={openOn(query, shifts.shifts)}
        today={today}
        shifts={shifts.shifts}
      />
    </div>
  )
}

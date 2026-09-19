import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { listDepartments } from "@/features/departments/actions"
import { EmployeeForm } from "@/features/employees/components/employee-form"
import { openOn } from "@/features/employees/open-on"
import { listShifts } from "@/features/shifts/actions"

export const metadata: Metadata = {
  title: "New Employee",
}

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("employees.manage")
  const [params, departments, shifts] = await Promise.all([
    searchParams,
    listDepartments(),
    listShifts(),
  ])
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <EmployeeForm
        departments={departments.departments.map((department) => department.name)}
        // Back from adding a department, with it picked.
        preset={openOn(params, shifts.shifts)}
        today={today}
        shifts={shifts.shifts}
      />
    </div>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listDepartments } from "@/features/departments/actions"
import { DepartmentTable } from "@/features/departments/components/department-table"
import { listEmployees } from "@/features/employees/actions"

export const metadata: Metadata = {
  title: "Departments",
}

export default async function DepartmentsPage() {
  await requirePermission("departments.manage")
  const [result, employees] = await Promise.all([listDepartments(), listEmployees()])

  const headcount: Record<string, number> = {}
  for (const employee of employees.employees) {
    if (employee.department) {
      headcount[employee.department] = (headcount[employee.department] ?? 0) + 1
    }
  }

  return (
    <>
      <Topbar
        title="Departments"
        section="Setup"
        actions={
          <Link
            href="/hris/departments/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 sm:h-8"
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Add Department</span>
          </Link>
        }
      />

      <main className="min-h-0 flex-1 overflow-auto">
        {!result.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <DepartmentTable departments={result.departments} headcount={headcount} />
      </main>
    </>
  )
}

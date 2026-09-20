import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listDepartments } from "@/features/departments/actions"
import { DepartmentList } from "@/features/departments/components/department-list"
import { applyDepartmentQuery, readDepartmentQuery } from "@/features/departments/query"
import { listEmployees } from "@/features/employees/actions"

export const metadata: Metadata = {
  title: "Departments",
}

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("departments.manage")
  const [params, result, employees] = await Promise.all([
    searchParams,
    listDepartments(),
    listEmployees(),
  ])
  const query = readDepartmentQuery(params)

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
            className={TOPBAR_ACTION_CLASS}
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Add Department</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <DepartmentList
          departments={applyDepartmentQuery(result.departments, query, headcount)}
          headcount={headcount}
          query={query}
          notice={result.ok ? undefined : result.error}
        />
      </main>
    </>
  )
}

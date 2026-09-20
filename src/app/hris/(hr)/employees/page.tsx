import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listEmployees } from "@/features/employees/actions"
import { EmployeeList } from "@/features/employees/components/employee-list"
import { applyEmployeeQuery, readEmployeeQuery } from "@/features/employees/query"

export const metadata: Metadata = {
  title: "Employees",
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("employees.manage")
  const [params, result] = await Promise.all([searchParams, listEmployees()])

  const byName = (a: string, b: string) => a.localeCompare(b)
  const departments = [
    ...new Set(result.employees.flatMap((employee) => employee.department ?? [])),
  ].sort(byName)
  const positions = [
    ...new Set(result.employees.flatMap((employee) => employee.position ?? [])),
  ].sort(byName)

  const query = readEmployeeQuery(params, { departments, positions })

  return (
    <>
      <Topbar
        title="Employees"
        section={null}
        actions={
          <Link href="/hris/employees/new" className={TOPBAR_ACTION_CLASS}>
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Add Employee</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <EmployeeList
          employees={applyEmployeeQuery(result.employees, query)}
          departments={departments}
          positions={positions}
          query={query}
          notice={result.ok ? undefined : result.error}
        />
      </main>
    </>
  )
}

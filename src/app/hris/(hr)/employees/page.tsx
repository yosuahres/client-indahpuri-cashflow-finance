import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listEmployees } from "@/features/employees/actions"
import { EmployeeFilters } from "@/features/employees/components/employee-filters"
import { EmployeeTable } from "@/features/employees/components/employee-table"

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

  const departments = [
    ...new Set(result.employees.flatMap((employee) => employee.department ?? [])),
  ].sort((a, b) => a.localeCompare(b))

  // A department nobody is in any more falls back to everyone.
  const department =
    typeof params.department === "string" && departments.includes(params.department)
      ? params.department
      : ""
  const employees = department
    ? result.employees.filter((employee) => employee.department === department)
    : result.employees

  return (
    <>
      <Topbar
        title="Employees"
        section={null}
        actions={
          <Link
            href="/hris/employees/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-2.5 text-sm font-medium text-white transition-opacity hover:opacity-85 sm:h-8"
          >
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">Add Employee</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <EmployeeFilters departments={departments} department={department} />

        {!result.ok ? (
          <p
            role="alert"
            className="border-t border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto border-t border-black/8">
          <EmployeeTable employees={employees} />
        </div>
      </main>
    </>
  )
}

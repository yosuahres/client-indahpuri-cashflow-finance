"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { Select } from "@/components/form/select"
import { cn } from "@/lib/cn"

/**
 * Narrows the employee list. The choice sits in the URL, so the view is
 * shareable and the rows are filtered on the server.
 */
export function EmployeeFilters({
  departments,
  department,
}: {
  /** Every department someone is filed under. */
  departments: string[]
  /** Empty shows everyone. */
  department: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function setDepartment(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set("department", value)
    else params.delete("department")
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  return (
    <div className={cn("px-4 py-3 sm:px-6 sm:py-4", pending && "opacity-60")}>
      <div className="w-full sm:w-56">
        <label htmlFor="employee-department" className="sr-only">
          Department
        </label>
        <Select
          id="employee-department"
          value={department}
          onValueChange={setDepartment}
          options={[
            { value: "", label: "All departments" },
            ...departments.map((name) => ({ value: name, label: name })),
          ]}
        />
      </div>
    </div>
  )
}

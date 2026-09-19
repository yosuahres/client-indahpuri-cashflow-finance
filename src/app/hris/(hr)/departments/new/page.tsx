import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { DepartmentForm } from "@/features/departments/components/department-form"
import { safeRedirectPath } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "New Department",
}

export default async function NewDepartmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("departments.manage")
  const params = await searchParams
  // Where to go back to once the department is saved.
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : undefined,
    "/hris/departments",
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <DepartmentForm next={next} />
    </div>
  )
}

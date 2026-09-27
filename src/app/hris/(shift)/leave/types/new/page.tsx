import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { LeaveTypeForm } from "@/features/leave/components/leave-type-form"
import { safeRedirectPath } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "New Leave Type",
}

export default async function NewLeaveTypePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("leave.manage")
  const params = await searchParams
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : undefined,
    "/hris/leave/types",
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <LeaveTypeForm next={next} />
    </div>
  )
}

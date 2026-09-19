import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { ShiftForm } from "@/features/shifts/components/shift-form"
import { safeRedirectPath } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "New Shift",
}

export default async function NewShiftPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("attendance.manage")
  const params = await searchParams
  // Where to go back to once the shift is saved — the employee form, usually.
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : undefined,
    "/hris/attendance/shifts",
  )

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <ShiftForm next={next} />
    </div>
  )
}

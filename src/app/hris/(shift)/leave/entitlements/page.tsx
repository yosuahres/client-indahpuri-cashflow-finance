import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { loadRoster } from "@/features/employees/roster"
import { loadLeaveEntitlements } from "@/features/leave/entitlements"
import { EntitlementPicker } from "@/features/leave/components/entitlement-picker"
import { EntitlementSheet } from "@/features/leave/components/entitlement-sheet"
import { listLeaveTypes } from "@/features/leave/type-actions"

export const metadata: Metadata = {
  title: "Leave Entitlements",
}

/** How many days of leave each person has a year, typed in per person. */
export default async function LeaveEntitlementsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("leave.manage")
  const params = await searchParams

  const thisYear = new Date().getUTCFullYear()
  const askedYear = Number(params.year)
  const year = Number.isInteger(askedYear) && askedYear >= 2000 && askedYear <= 2100 ? askedYear : thisYear
  const [roster, entitlements, types] = await Promise.all([
    loadRoster(),
    loadLeaveEntitlements([year]),
    listLeaveTypes(),
  ])

  const askedType = typeof params.type === "string" ? params.type : ""
  // The first type (Annual, as seeded) unless the URL names another.
  const leaveTypeId = types.types.some((type) => type.id === askedType)
    ? askedType
    : (types.types[0]?.id ?? "")

  const onFile = Object.fromEntries(
    entitlements.entitlements
      .filter((entitlement) => entitlement.leaveTypeId === leaveTypeId)
      .map((entitlement) => [entitlement.employeeId, entitlement]),
  )

  return (
    <>
      <Topbar title="Leave Entitlements" section="Setup" />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <p className="shrink-0 border-b border-black/8 px-4 py-2.5 text-sm text-neutral-500 sm:px-6">
          Days of leave each person has in the year. Approved leave comes off on its own, and
          leave that would go over the entitlement is refused.
        </p>

        <div className="shrink-0 border-b border-black/8">
          <EntitlementPicker year={year} leaveTypeId={leaveTypeId} types={types.types} />
        </div>

        {!roster.ok || !entitlements.ok || !types.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {roster.error ?? entitlements.error ?? types.error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {leaveTypeId ? (
            <EntitlementSheet
              // A new year or type starts from what is on file for it.
              key={`${year}-${leaveTypeId}`}
              year={year}
              leaveTypeId={leaveTypeId}
              roster={roster.employees}
              entitlements={onFile}
            />
          ) : (
            <p className="px-4 py-10 text-center text-sm text-neutral-500 sm:px-6">
              No leave types yet. Add one under Leave Types first.
            </p>
          )}
        </div>
      </main>
    </>
  )
}

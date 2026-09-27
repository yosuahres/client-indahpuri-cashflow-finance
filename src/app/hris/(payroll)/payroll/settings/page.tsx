import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { PayrollSettingsForm } from "@/features/payroll/components/settings-form"
import { loadPayrollRates } from "@/features/payroll/data"

export const metadata: Metadata = {
  title: "Payroll Settings",
}

/** The meal allowance and BPJS rates every payroll is worked out on. */
export default async function PayrollSettingsPage() {
  await requirePermission("payroll.manage")
  const result = await loadPayrollRates()

  return (
    <>
      <Topbar title="Payroll Settings" section="Setup" />

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {!result.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <PayrollSettingsForm rates={result.rates} />
      </main>
    </>
  )
}

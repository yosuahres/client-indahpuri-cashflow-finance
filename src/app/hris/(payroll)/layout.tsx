import type { ReactNode } from "react"

import { ModuleShell } from "@/components/layout/module-shell"

/** Payroll, a sub-module of HRIS: the monthly pay run and its rates, with a sidebar of their own. */
export default function PayrollLayout({ children }: { children: ReactNode }) {
  return <ModuleShell module="payroll">{children}</ModuleShell>
}

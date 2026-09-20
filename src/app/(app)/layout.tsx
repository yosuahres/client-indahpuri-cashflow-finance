import type { ReactNode } from "react"

import { ModuleShell } from "@/components/layout/module-shell"

/** Finance: the ledger, the accounts behind it, and what was planned. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <ModuleShell module="finance">{children}</ModuleShell>
}

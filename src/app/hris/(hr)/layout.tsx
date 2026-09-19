import type { ReactNode } from "react"

import { ModuleShell } from "@/components/layout/module-shell"

/** HR proper: the roll, the people on it, and the departments they sit in. */
export default function HrLayout({ children }: { children: ReactNode }) {
  return <ModuleShell module="hris">{children}</ModuleShell>
}

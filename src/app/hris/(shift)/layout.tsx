import type { ReactNode } from "react"

import { ModuleShell } from "@/components/layout/module-shell"

/** Shift & Attendance: the daily roll call and leave, with a sidebar of their own. */
export default function ShiftLayout({ children }: { children: ReactNode }) {
  return <ModuleShell module="shift">{children}</ModuleShell>
}

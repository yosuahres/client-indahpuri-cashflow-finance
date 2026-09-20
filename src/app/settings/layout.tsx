import type { ReactNode } from "react"

import { ModuleShell } from "@/components/layout/module-shell"

/**
 * Settings stands apart from the apps, with its own sidebar. Everyone may open
 * their Account; each team page checks `users.manage` itself.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <ModuleShell module="settings">{children}</ModuleShell>
}

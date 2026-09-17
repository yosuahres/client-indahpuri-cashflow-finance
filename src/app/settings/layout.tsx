import type { ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider } from "@/components/layout/sidebar-state"
import { signOut } from "@/features/auth/actions"
import { requirePermission } from "@/features/auth/session"

/** Settings stands apart from the apps: its own sidebar, managers only. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { name, email, role, roleName, permissions } = await requirePermission("users.manage")

  return (
    <SidebarProvider>
      <div className="flex h-dvh overflow-hidden bg-white">
        <AppSidebar
          module="settings"
          user={{ name, email, role, roleName, permissions }}
          signOut={signOut}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  )
}

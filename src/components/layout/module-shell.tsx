import type { ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { SidebarProvider } from "@/components/layout/sidebar-state"
import { signOut } from "@/features/auth/actions"
import { requireUser } from "@/features/auth/session"

import type { SidebarArea } from "./nav-config"

/**
 * The frame an app's pages sit in: its own sidebar, and the page beside it.
 * Each area that navigates on its own has a layout of its own naming itself
 * here, so the sidebar follows you rather than being worked out per page.
 */
export async function ModuleShell({
  module,
  children,
}: {
  module: SidebarArea
  children: ReactNode
}) {
  const { name, email, role, roleName, permissions } = await requireUser()

  return (
    <SidebarProvider>
      <div className="flex h-dvh overflow-hidden bg-white">
        <AppSidebar
          module={module}
          user={{ name, email, role, roleName, permissions }}
          signOut={signOut}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      </div>
    </SidebarProvider>
  )
}

import type { ReactNode } from "react"

import { AppSidebar } from "@/components/layout/app-sidebar"
import { signOut } from "@/features/auth/actions"
import { SignOutIcon } from "@/features/auth/components/sign-out-icon"
import { requireUser } from "@/features/auth/session"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  const email = user.email ?? ""
  const name =
    (user.user_metadata?.full_name as string | undefined) ?? email.split("@")[0]

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      <AppSidebar
        user={{ name, email }}
        onSignOut={
          <form action={signOut}>
            <SignOutIcon />
          </form>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  )
}

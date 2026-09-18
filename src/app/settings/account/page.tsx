import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { AccountSettings } from "@/features/account/components/account-settings"
import { requireUser } from "@/features/auth/session"

export const metadata: Metadata = {
  title: "Account · Settings",
}

/** Everyone's own account, whatever their role. */
export default async function SettingsAccountPage() {
  const { id, name, email } = await requireUser()

  return (
    <>
      <Topbar title="Account" section="Settings" />
      <main className="min-h-0 flex-1 overflow-y-auto bg-white">
        <AccountSettings user={{ id, name, email }} />
      </main>
    </>
  )
}

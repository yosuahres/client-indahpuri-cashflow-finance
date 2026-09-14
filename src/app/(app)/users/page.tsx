import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { Card, CardHeader } from "@/components/ui/card"
import { requireRole } from "@/features/auth/session"
import { listTeam } from "@/features/users/actions"
import { UserTable } from "@/features/users/components/user-table"

export const metadata: Metadata = {
  title: "Users",
}

export default async function UsersPage() {
  const me = await requireRole("manager")
  const result = await listTeam()

  return (
    <>
      <Topbar title="Users" section={null} />

      <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50">
        {!result.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <div className="p-4 sm:p-6">
          <Card className="overflow-hidden">
            <CardHeader
              title="Team"
              caption="New people sign up themselves, then wait here until you give them a role. Managers can do everything; Admins only see the Dashboard and Laporan Keuangan."
            />
            <div className="mt-4">
              <UserTable members={result.members} meId={me.id} />
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { Card, CardHeader } from "@/components/ui/card"
import { requirePermission } from "@/features/auth/session"
import { listRoles } from "@/features/roles/actions"
import { listTeam } from "@/features/users/actions"
import { UserTable } from "@/features/users/components/user-table"

export const metadata: Metadata = {
  title: "Users · Settings",
}

export default async function SettingsUsersPage() {
  const me = await requirePermission("users.manage")
  const [result, { roles }] = await Promise.all([listTeam(), listRoles()])

  return (
    <>
      <Topbar title="Users" section="Settings" />

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
              caption="Everyone who has signed up, and the role they have."
              action={
                <Link
                  href="/settings/users/new"
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 px-2.5 text-sm text-neutral-700 hover:border-black/20 hover:text-neutral-900"
                >
                  <Plus className="size-4 shrink-0" strokeWidth={1.75} />
                  New User
                </Link>
              }
            />
            <div className="mt-4">
              <UserTable members={result.members} roles={roles} meId={me.id} />
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}

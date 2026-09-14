import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

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
      <Topbar
        title="Users"
        section={null}
        actions={
          <Link
            href="/users/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-black/10 px-2.5 text-sm text-neutral-700 hover:border-black/20 hover:text-neutral-900 sm:h-8"
          >
            <Plus className="size-4 shrink-0" strokeWidth={1.75} />
            <span className="hidden sm:inline">New User</span>
          </Link>
        }
      />

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

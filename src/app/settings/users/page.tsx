import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listRoles } from "@/features/roles/actions"
import { listTeam } from "@/features/users/actions"
import { UserList } from "@/features/users/components/user-list"
import { applyUserQuery, readUserQuery } from "@/features/users/query"

export const metadata: Metadata = {
  title: "Users · Settings",
}

export default async function SettingsUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const me = await requirePermission("users.manage")
  const [params, result, { roles }] = await Promise.all([searchParams, listTeam(), listRoles()])
  const query = readUserQuery(params, roles)

  return (
    <>
      <Topbar
        title="Users"
        section="Settings"
        actions={
          <Link href="/settings/users/new" className={TOPBAR_ACTION_CLASS}>
            <Plus className="size-4 shrink-0" strokeWidth={2} />
            <span className="hidden sm:inline">New User</span>
          </Link>
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <UserList
          members={applyUserQuery(result.members, query, roles)}
          roles={roles}
          meId={me.id}
          query={query}
          notice={result.ok ? undefined : result.error}
        />
      </main>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar, TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"
import { PERMISSIONS } from "@/features/auth/permissions"
import { requirePermission } from "@/features/auth/session"
import { listGrants } from "@/features/permissions/actions"
import { listRoles } from "@/features/roles/actions"
import { RoleList } from "@/features/roles/components/role-list"
import { applyRoleQuery, readRoleQuery } from "@/features/roles/query"
import { listTeam } from "@/features/users/actions"

export const metadata: Metadata = {
  title: "Roles · Settings",
}

export default async function SettingsRolesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("users.manage")
  const [params, roles, team, grants] = await Promise.all([
    searchParams,
    listRoles(),
    listTeam(),
    listGrants(),
  ])
  const error = !roles.ok ? roles.error : !team.ok ? team.error : !grants.ok ? grants.error : null

  const rows = roles.roles.map((role) => ({
    ...role,
    members: team.members.filter((member) => member.role === role.key).length,
    permissions: grants.grants[role.key]?.length ?? 0,
  }))
  const waiting = team.members.filter((member) => member.role === null).length
  const query = readRoleQuery(params)

  return (
    <>
      <Topbar
        title="Roles"
        section="Settings"
        actions={
          roles.ok ? (
            <Link href="/settings/roles/new" className={TOPBAR_ACTION_CLASS}>
              <Plus className="size-4 shrink-0" strokeWidth={2} />
              <span className="hidden sm:inline">New Role</span>
            </Link>
          ) : null
        }
      />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {/* Nobody is shut out silently: a role waiting to be given is said
            here, above the roles it could be given from. */}
        {waiting > 0 ? (
          <p className="border-b border-black/8 px-4 py-2.5 text-sm text-neutral-600 sm:px-6">
            {waiting} {waiting === 1 ? "person is" : "people are"} waiting for a role.
          </p>
        ) : null}

        <RoleList
          roles={applyRoleQuery(rows, query)}
          totalPermissions={PERMISSIONS.length}
          editable={roles.ok}
          query={query}
          notice={error ?? undefined}
        />
      </main>
    </>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"

import { Topbar } from "@/components/layout/topbar"
import { Card, CardHeader } from "@/components/ui/card"
import { PERMISSIONS } from "@/features/auth/permissions"
import { requirePermission } from "@/features/auth/session"
import { listGrants } from "@/features/permissions/actions"
import { listRoles } from "@/features/roles/actions"
import { RoleTable } from "@/features/roles/components/role-table"
import { listTeam } from "@/features/users/actions"

export const metadata: Metadata = {
  title: "Roles · Settings",
}

export default async function SettingsRolesPage() {
  await requirePermission("users.manage")
  const [roles, team, grants] = await Promise.all([listRoles(), listTeam(), listGrants()])
  const error = !roles.ok ? roles.error : !team.ok ? team.error : !grants.ok ? grants.error : null

  const rows = roles.roles.map((role) => ({
    ...role,
    members: team.members.filter((member) => member.role === role.key).length,
    permissions: grants.grants[role.key]?.length ?? 0,
  }))
  const waiting = team.members.filter((member) => member.role === null).length

  return (
    <>
      <Topbar title="Roles" section="Settings" />

      <main className="min-h-0 flex-1 overflow-y-auto bg-neutral-50">
        {error ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {error}
          </p>
        ) : null}

        <div className="p-4 sm:p-6">
          <Card className="overflow-hidden">
            <CardHeader
              title="Roles"
              caption={`What someone can be given in Users. What each role may do is set in Permissions.${
                waiting > 0 ? ` ${waiting} ${waiting === 1 ? "person is" : "people are"} waiting for a role.` : ""
              }`}
              action={
                roles.ok ? (
                  <Link
                    href="/settings/roles/new"
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 px-2.5 text-sm text-neutral-700 hover:border-black/20 hover:text-neutral-900"
                  >
                    <Plus className="size-4 shrink-0" strokeWidth={1.75} />
                    New Role
                  </Link>
                ) : null
              }
            />
            <div className="mt-4">
              <RoleTable roles={rows} totalPermissions={PERMISSIONS.length} editable={roles.ok} />
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}

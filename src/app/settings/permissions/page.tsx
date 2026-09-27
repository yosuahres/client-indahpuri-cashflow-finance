import type { Metadata } from "next"

import { SettingsPage } from "@/components/layout/settings-page"
import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listGrants } from "@/features/permissions/actions"
import { PermissionMatrix } from "@/features/permissions/components/permission-matrix"
import { listRoles } from "@/features/roles/actions"

export const metadata: Metadata = {
  title: "Permissions · Settings",
}

export default async function SettingsPermissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requirePermission("users.manage")
  const [params, result, { roles }] = await Promise.all([searchParams, listGrants(), listRoles()])
  // An unknown or missing role opens on the first one.
  const role = roles.find((entry) => entry.key === params.role)?.key ?? roles[0]?.key

  return (
    <>
      <Topbar title="Permissions" section="Settings" />

      <SettingsPage
        title="Permissions"
        description="Pick a role and tick what it may do. Changes apply straight away, from everyone's next click."
      >
        {!result.ok ? (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
          >
            {result.error}
          </p>
        ) : null}

        {role ? (
          <PermissionMatrix roles={roles} role={role} grants={result.grants} disabled={!result.ok} />
        ) : (
          <p className="text-sm text-neutral-500">No roles yet.</p>
        )}
      </SettingsPage>
    </>
  )
}

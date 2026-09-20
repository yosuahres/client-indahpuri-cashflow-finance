import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { requirePermission } from "@/features/auth/session"
import { listGrants } from "@/features/permissions/actions"
import { PermissionMatrix } from "@/features/permissions/components/permission-matrix"
import { listRoles } from "@/features/roles/actions"

export const metadata: Metadata = {
  title: "Permissions · Settings",
}

export default async function SettingsPermissionsPage() {
  await requirePermission("users.manage")
  const [result, { roles }] = await Promise.all([listGrants(), listRoles()])

  return (
    <>
      <Topbar title="Permissions" section="Settings" />

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {!result.ok ? (
          <p
            role="alert"
            className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6"
          >
            {result.error}
          </p>
        ) : null}

        <p className="px-4 py-3 text-sm text-neutral-500 sm:px-6 sm:py-4">
          Tick what each role may do. Changes apply straight away, from everyone&apos;s next click.
        </p>

        <div className="min-h-0 flex-1 overflow-auto border-t border-black/8">
          <PermissionMatrix roles={roles} grants={result.grants} disabled={!result.ok} />
        </div>
      </main>
    </>
  )
}

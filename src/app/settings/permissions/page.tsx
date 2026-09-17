import type { Metadata } from "next"

import { Topbar } from "@/components/layout/topbar"
import { Card, CardHeader } from "@/components/ui/card"
import { requirePermission } from "@/features/auth/session"
import { listGrants } from "@/features/permissions/actions"
import { listRoles } from "@/features/roles/actions"
import { PermissionMatrix } from "@/features/permissions/components/permission-matrix"

export const metadata: Metadata = {
  title: "Permissions · Settings",
}

export default async function SettingsPermissionsPage() {
  await requirePermission("users.manage")
  const [result, { roles }] = await Promise.all([listGrants(), listRoles()])

  return (
    <>
      <Topbar title="Permissions" section="Settings" />

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
              title="Role permissions"
              caption="Tick what each role may do. Changes apply straight away, from everyone's next click."
            />
            <div className="mt-4 border-t border-black/8">
              <PermissionMatrix roles={roles} grants={result.grants} disabled={!result.ok} />
            </div>
          </Card>
        </div>
      </main>
    </>
  )
}

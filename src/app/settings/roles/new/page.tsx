import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { listRoles } from "@/features/roles/actions"
import { RoleForm } from "@/features/roles/components/role-form"

export const metadata: Metadata = {
  title: "New Role · Settings",
}

export default async function NewRolePage() {
  await requirePermission("users.manage")
  const { roles } = await listRoles()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <RoleForm roles={roles} />
    </div>
  )
}

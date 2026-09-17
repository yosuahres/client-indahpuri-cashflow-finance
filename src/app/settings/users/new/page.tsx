import type { Metadata } from "next"

import { requirePermission } from "@/features/auth/session"
import { listRoles } from "@/features/roles/actions"
import { UserForm } from "@/features/users/components/user-form"

export const metadata: Metadata = {
  title: "New User",
}

export default async function NewUserPage() {
  await requirePermission("users.manage")
  const { roles } = await listRoles()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <UserForm roles={roles} />
    </div>
  )
}

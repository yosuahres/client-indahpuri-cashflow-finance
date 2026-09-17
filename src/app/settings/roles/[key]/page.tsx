import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requirePermission } from "@/features/auth/session"
import { listRoles } from "@/features/roles/actions"
import { RoleForm } from "@/features/roles/components/role-form"

export const metadata: Metadata = {
  title: "Edit Role · Settings",
}

export default async function EditRolePage({ params }: { params: Promise<{ key: string }> }) {
  await requirePermission("users.manage")
  const [{ key }, result] = await Promise.all([params, listRoles()])

  if (!result.ok) {
    return (
      <div className="min-h-0 flex-1 overflow-y-auto">
        <p role="alert" className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6">
          {result.error}
        </p>
      </div>
    )
  }

  const role = result.roles.find((entry) => entry.key === key)
  if (!role) notFound()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <RoleForm role={role} roles={result.roles} />
    </div>
  )
}

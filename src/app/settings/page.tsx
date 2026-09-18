import { redirect } from "next/navigation"

import { can } from "@/features/auth/permissions"
import { requireUser } from "@/features/auth/session"

export default async function SettingsPage() {
  const { permissions } = await requireUser()
  redirect(can(permissions, "users.manage") ? "/settings/users" : "/settings/account")
}

import { redirect } from "next/navigation"

import { requirePermission } from "@/features/auth/session"

export default async function SettingsPage() {
  await requirePermission("users.manage")
  redirect("/settings/users")
}

import type { Metadata } from "next"

import { requireRole } from "@/features/auth/session"
import { UserForm } from "@/features/users/components/user-form"

export const metadata: Metadata = {
  title: "New User",
}

export default async function NewUserPage() {
  await requireRole("manager")

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <UserForm />
    </div>
  )
}

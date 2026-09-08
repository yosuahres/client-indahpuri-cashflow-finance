"use client"

import { LogOut } from "lucide-react"
import { useFormStatus } from "react-dom"

export function SignOutIcon() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Sign out"
      title="Sign out"
      className="grid size-7 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-40"
    >
      <LogOut className="size-4" strokeWidth={1.75} />
    </button>
  )
}

"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"

import { cn } from "@/lib/cn"

/**
 * Re-runs the server render of the current route, so the report picks up
 * entries added since the page was loaded. The transition keeps the button
 * spinning until the new payload has been applied.
 */
export function RefreshButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      aria-label="Refresh data"
      aria-busy={pending}
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
      className="grid size-8 place-items-center rounded-md border border-black/10 bg-white text-neutral-600 hover:bg-neutral-50 disabled:cursor-default disabled:opacity-60"
    >
      <RefreshCw
        className={cn("size-4", pending && "animate-spin")}
        strokeWidth={1.75}
      />
    </button>
  )
}

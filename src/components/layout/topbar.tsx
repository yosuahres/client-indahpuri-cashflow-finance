import Link from "next/link"
import { House } from "lucide-react"
import type { ReactNode } from "react"

import { RefreshButton } from "./refresh-button"
import { SidebarTrigger } from "./sidebar-state"

export function Topbar({
  title,
  section = "Financial Reports",
  actions,
}: {
  title: string
  /** The crumb between Home and the title. `null` drops it entirely. */
  section?: string | null
  /** Page-specific controls, shown before the refresh button. */
  actions?: ReactNode
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-black/8 bg-white px-3 sm:gap-3 sm:px-5">
      <SidebarTrigger />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
        {/* The crumbs ahead of the title give way as the screen narrows. */}
        <Link
          href="/"
          aria-label="Home"
          className="hidden text-neutral-500 hover:text-neutral-900 sm:block"
        >
          <House className="size-4" strokeWidth={1.75} />
        </Link>
        <span aria-hidden className="hidden text-neutral-300 sm:inline">
          /
        </span>
        {section ? (
          <span className="hidden items-center gap-2 md:flex">
            <span className="text-sm text-neutral-500">{section}</span>
            <span aria-hidden className="text-neutral-300">
              /
            </span>
          </span>
        ) : null}
        <span aria-current="page" className="truncate text-sm font-medium text-neutral-900">
          {title}
        </span>
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        {actions}
        <RefreshButton />
      </div>
    </header>
  )
}

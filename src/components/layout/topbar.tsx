import Link from "next/link"
import { House } from "lucide-react"

import { RefreshButton } from "./refresh-button"

export function Topbar({ title }: { title: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/8 bg-white px-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
        <Link
          href="/"
          aria-label="Home"
          className="text-neutral-500 hover:text-neutral-900"
        >
          <House className="size-4" strokeWidth={1.75} />
        </Link>
        <span aria-hidden className="text-neutral-300">
          /
        </span>
        <span className="text-sm text-neutral-500">Financial Reports</span>
        <span aria-hidden className="text-neutral-300">
          /
        </span>
        <span aria-current="page" className="truncate text-sm font-medium text-neutral-900">
          {title}
        </span>
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <RefreshButton />
      </div>
    </header>
  )
}

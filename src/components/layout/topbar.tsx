import Link from "next/link"
import { ChevronsUpDown, House, MoreHorizontal, RefreshCw } from "lucide-react"

import { StatementSwitcher } from "./statement-switcher"

const chip =
  "inline-flex h-8 items-center gap-1.5 rounded-md border border-black/10 bg-white px-2.5 text-sm text-neutral-700 hover:bg-neutral-50"

export function Topbar({
  title,
  statement,
}: {
  title: string
  /** Route of the statement currently shown, e.g. "/cash-flow". */
  statement: string
}) {
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
        <StatementSwitcher current={statement} />
        <button type="button" className={chip}>
          Actions
          <ChevronsUpDown className="size-3.5 text-neutral-400" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Refresh report"
          className="grid size-8 place-items-center rounded-md border border-black/10 bg-white text-neutral-600 hover:bg-neutral-50"
        >
          <RefreshCw className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="More options"
          className="grid size-8 place-items-center rounded-md border border-black/10 bg-white text-neutral-600 hover:bg-neutral-50"
        >
          <MoreHorizontal className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}

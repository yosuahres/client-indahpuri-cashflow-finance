import Link from "next/link"
import type { ReactNode } from "react"
import { House } from "lucide-react"

import { SidebarTrigger } from "@/components/layout/sidebar-state"
import { cn } from "@/lib/cn"

/** Sticky document header: breadcrumb, dirty-state badge, primary action. */
export function FormHeader({
  crumbs,
  title,
  status,
  action,
}: {
  crumbs: { label: string; href?: string }[]
  title: string
  status?: ReactNode
  action: ReactNode
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-black/8 bg-white px-3 sm:gap-3 sm:px-5">
      <SidebarTrigger />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
        {/* Only the page title survives on a phone; the trail needs the room. */}
        <Link
          href="/"
          aria-label="Home"
          className="hidden text-neutral-500 hover:text-neutral-900 sm:block"
        >
          <House className="size-4" strokeWidth={1.75} />
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.label} className="hidden items-center gap-2 sm:flex">
            <span aria-hidden className="text-neutral-300">
              /
            </span>
            {crumb.href ? (
              <Link href={crumb.href} className="text-sm text-neutral-500 hover:text-neutral-900">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-sm text-neutral-500">{crumb.label}</span>
            )}
          </span>
        ))}
        <span aria-hidden className="hidden text-neutral-300 sm:inline">
          /
        </span>
        <span aria-current="page" className="truncate text-sm font-semibold text-neutral-900">
          {title}
        </span>
        {status}
      </nav>

      <div className="ml-auto flex shrink-0 items-center gap-2">{action}</div>
    </header>
  )
}

export function NotSavedBadge() {
  return (
    <span className="ml-1 hidden rounded bg-orange-100 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-orange-700 sm:inline">
      Not Saved
    </span>
  )
}

/** One divider-separated block of the document. */
export function FormSection({
  title,
  children,
  className,
  wide,
  flush,
}: {
  title?: string
  children: ReactNode
  className?: string
  /**
   * Drops the reading-width column. For blocks that are a grid rather than a
   * form — twelve months of figures need the whole page, not a text measure.
   */
  wide?: boolean
  /**
   * Drops the side padding too, so the block runs to both edges. `cn` only
   * joins, so this has to replace the padding classes rather than override
   * them — two competing `px-` utilities are settled by stylesheet order.
   */
  flush?: boolean
}) {
  return (
    <section
      className={cn(
        "border-b border-black/8 py-6 sm:py-8",
        !flush && "px-4 sm:px-6",
        className,
      )}
    >
      <div className={cn("mx-auto", wide ? "max-w-none" : "max-w-4xl")}>
        {title ? (
          <h2 className="mb-4 text-sm font-semibold text-neutral-900 sm:mb-6">{title}</h2>
        ) : null}
        {children}
      </div>
    </section>
  )
}

/** The two-column field grid; pass `className="md:col-span-2"` to span a field. */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">{children}</div>
}

export function SaveButton({
  pending,
  children = "Save",
}: {
  pending: boolean
  children?: string
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-40 sm:h-8"
    >
      {pending ? "Saving…" : children}
    </button>
  )
}

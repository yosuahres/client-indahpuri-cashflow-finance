import Link from "next/link"
import type { ReactNode } from "react"
import { House } from "lucide-react"

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
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-black/8 bg-white px-5">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2">
        <Link href="/" aria-label="Home" className="text-neutral-500 hover:text-neutral-900">
          <House className="size-4" strokeWidth={1.75} />
        </Link>
        {crumbs.map((crumb) => (
          <span key={crumb.label} className="flex items-center gap-2">
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
        <span aria-hidden className="text-neutral-300">
          /
        </span>
        <span aria-current="page" className="truncate text-sm font-semibold text-neutral-900">
          {title}
        </span>
        {status}
      </nav>

      <div className="ml-auto flex items-center gap-2">{action}</div>
    </header>
  )
}

export function NotSavedBadge() {
  return (
    <span className="ml-1 rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
      Not Saved
    </span>
  )
}

/** One divider-separated block of the document. */
export function FormSection({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("border-b border-black/8 px-6 py-8", className)}>
      <div className="mx-auto max-w-4xl">
        {title ? (
          <h2 className="mb-6 text-sm font-semibold text-neutral-900">{title}</h2>
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
      className="inline-flex h-8 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-85 disabled:pointer-events-none disabled:opacity-40"
    >
      {pending ? "Saving…" : children}
    </button>
  )
}

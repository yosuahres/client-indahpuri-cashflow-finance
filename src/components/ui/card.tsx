import type { ReactNode } from "react"

import { cn } from "@/lib/cn"

/** The white panel every dashboard block sits in, against the tinted page. */
export function Card({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-black/8 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  )
}

/**
 * Title row of a card. The caption says what the panel plots — with one series
 * per card, that sentence does the work a legend used to.
 */
export function CardHeader({
  id,
  title,
  caption,
  action,
}: {
  id?: string
  title: string
  caption?: string
  /** Sits opposite the title — a link out, usually. */
  action?: ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
      <div className="min-w-0">
        <h3 id={id} className="text-sm font-semibold text-neutral-900">
          {title}
        </h3>
        {caption ? <p className="mt-0.5 text-xs text-neutral-500">{caption}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

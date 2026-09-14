import type { ReactNode } from "react"

import { cn } from "@/lib/cn"

/**
 * How a card sits on the page. `raised` is the white panel against a tinted
 * page; `flat` drops the shadow for a hairline border on a white page, as the
 * dashboard draws it.
 */
export type CardVariant = "raised" | "flat"

const VARIANTS: Record<CardVariant, string> = {
  raised: "rounded-xl border border-black/8 bg-white shadow-sm",
  flat: "rounded-2xl border border-black/6 bg-white",
}

/** The white panel every dashboard block sits in. */
export function Card({
  className,
  variant = "raised",
  children,
}: {
  className?: string
  variant?: CardVariant
  children: ReactNode
}) {
  return <div className={cn(VARIANTS[variant], className)}>{children}</div>
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
  variant = "raised",
}: {
  id?: string
  title: string
  caption?: string
  /** Sits opposite the title — a link out, usually. */
  action?: ReactNode
  variant?: CardVariant
}) {
  const flat = variant === "flat"

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3",
        flat ? "px-4 pt-3.5" : "px-4 pt-4 sm:px-5 sm:pt-5",
      )}
    >
      <div className="min-w-0">
        <h3
          id={id}
          className={
            flat
              ? "text-sm font-medium text-neutral-800"
              : "text-sm font-semibold text-neutral-900"
          }
        >
          {title}
        </h3>
        {caption ? (
          <p className="mt-0.5 text-xs text-neutral-500">
            {caption}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/** A quiet grey pill for the control opposite a flat card's title. */
export const CARD_ACTION_CLASS =
  "inline-flex h-7 items-center rounded-md bg-neutral-100 px-2.5 text-xs text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900"

/** Stands in for a plot with nothing to draw, holding the plot's footprint. */
export function CardEmpty({ label = "No Data", className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-[180px] items-center justify-center rounded-lg bg-neutral-100/70 px-4 text-center text-sm text-neutral-400",
        className,
      )}
    >
      {label}
    </div>
  )
}

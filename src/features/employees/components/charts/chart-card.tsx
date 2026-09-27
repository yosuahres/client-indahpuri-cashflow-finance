import type { ReactNode } from "react"

import { Card, CardEmpty, CardHeader } from "@/components/ui/card"
import { formatPercent } from "@/lib/format"
import type { Slice } from "../../dashboard"

/** The flat dashboard card every HR chart sits in, with its empty state. */
export function ChartCard({
  title,
  caption,
  action,
  empty,
  emptyLabel,
  children,
}: {
  title: string
  caption?: string
  /** Sits opposite the title — a link out, usually. */
  action?: ReactNode
  empty: boolean
  emptyLabel: string
  children: ReactNode
}) {
  return (
    <Card variant="flat" className="min-w-0">
      <CardHeader variant="flat" title={title} caption={caption} action={action} />
      <div className="px-4 pt-3 pb-4">
        {empty ? <CardEmpty label={emptyLabel} className="min-h-[160px]" /> : children}
      </div>
    </Card>
  )
}

/**
 * Names every coloured group with its count and share, so identity never rests
 * on the fill alone. The text keeps its ink; only the swatch wears the hue.
 */
export function ChartLegend({
  slices,
  colors,
  className,
}: {
  slices: Slice[]
  colors: Record<string, string>
  className?: string
}) {
  return (
    <dl className={className}>
      {slices.map((slice) => (
        <div key={slice.label} className="flex items-center gap-2.5 py-1">
          <span
            aria-hidden
            className="size-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: colors[slice.label] }}
          />
          <dt className="min-w-0 flex-1 truncate text-sm text-neutral-600">{slice.label}</dt>
          <dd className="text-sm font-medium text-neutral-900 tabular-nums">{slice.count}</dd>
          <dd className="w-12 text-right text-xs text-neutral-400 tabular-nums">
            {formatPercent(slice.share)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** What a mark says on hover, and to assistive tech. */
export function describe(slice: Slice) {
  return `${slice.label}: ${slice.count} (${formatPercent(slice.share)})`
}

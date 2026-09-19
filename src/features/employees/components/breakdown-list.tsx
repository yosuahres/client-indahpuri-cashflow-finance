import type { ReactNode } from "react"

import { Card, CardEmpty, CardHeader } from "@/components/ui/card"
import { formatPercent } from "@/lib/format"
import type { Slice } from "../dashboard"

/**
 * A part-to-whole split as a labelled bar per group. A pie would need a colour
 * per department and a legend to read it back; here the label sits on the bar
 * it belongs to, and the count is written out rather than inferred from length.
 */
export function BreakdownList({
  title,
  caption,
  slices,
  emptyLabel,
  action,
}: {
  title: string
  caption?: string
  slices: Slice[]
  emptyLabel: string
  /** Sits opposite the title — a link out, usually. */
  action?: ReactNode
}) {
  // The longest bar fills the track, so small splits stay readable.
  const largest = Math.max(0, ...slices.map((slice) => slice.count))

  return (
    <Card variant="flat" className="min-w-0">
      <CardHeader variant="flat" title={title} caption={caption} action={action} />
      <div className="px-4 pt-3 pb-4">
        {slices.length === 0 ? (
          <CardEmpty label={emptyLabel} className="min-h-[120px]" />
        ) : (
          <dl className="space-y-2.5">
            {slices.map((slice) => (
              <div key={slice.label}>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="min-w-0 truncate text-sm text-neutral-700">{slice.label}</dt>
                  <dd className="shrink-0 text-sm text-neutral-800">
                    <span className="font-medium">{slice.count}</span>
                    <span className="ml-1.5 text-xs text-neutral-400">
                      {formatPercent(slice.share)}
                    </span>
                  </dd>
                </div>
                <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-800"
                    style={{ width: `${largest > 0 ? (slice.count / largest) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </dl>
        )}
      </div>
    </Card>
  )
}

import type { ReactNode } from "react"

import { Card, CardEmpty, CardHeader } from "@/components/ui/card"
import { formatCurrency, formatPercent } from "@/lib/format"

import type { MoneySlice } from "../dashboard"

/**
 * A rupiah whole split into parts, one labelled bar each — the HR dashboard's
 * breakdown, with the amounts written as money rather than counts.
 */
export function MoneyBreakdown({
  title,
  caption,
  slices,
  emptyLabel,
  action,
}: {
  title: string
  caption?: string
  slices: MoneySlice[]
  emptyLabel: string
  action?: ReactNode
}) {
  // The longest bar fills the track, so small parts stay readable.
  const largest = Math.max(0, ...slices.map((slice) => slice.amount))

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
                  <dd className="shrink-0 text-sm text-neutral-800 tabular-nums">
                    <span className="font-medium">{formatCurrency(slice.amount)}</span>
                    <span className="ml-1.5 text-xs text-neutral-400">{formatPercent(slice.share)}</span>
                  </dd>
                </div>
                <div aria-hidden className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-neutral-800"
                    style={{ width: `${largest > 0 ? (slice.amount / largest) * 100 : 0}%` }}
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

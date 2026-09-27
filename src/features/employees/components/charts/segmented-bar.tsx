import type { ReactNode } from "react"

import type { Slice } from "../../dashboard"
import { ChartLegend, describe } from "./chart-card"

/**
 * One whole as a single bar cut into its groups: the right shape when one
 * group dominates and the question is how much of the rest there is.
 */
export function SegmentedBar({
  slices,
  colors,
  headline,
}: {
  slices: Slice[]
  colors: Record<string, string>
  /** The one figure the bar is there to back up, written out above it. */
  headline: ReactNode
}) {
  return (
    <div>
      <div className="text-sm text-neutral-600">{headline}</div>

      <div aria-hidden className="mt-3 flex h-4 gap-0.5 overflow-hidden rounded-[4px]">
        {slices.map((slice) => (
          <div
            key={slice.label}
            title={describe(slice)}
            className="h-full min-w-0.5 transition-opacity hover:opacity-75"
            style={{ flexGrow: slice.count, flexBasis: 0, backgroundColor: colors[slice.label] }}
          />
        ))}
      </div>

      <ChartLegend
        slices={slices}
        colors={colors}
        className="mt-4 grid gap-x-6 sm:grid-cols-2"
      />
    </div>
  )
}

import { SINGLE_SERIES } from "../../chart-colors"
import type { Slice } from "../../dashboard"
import { describe } from "./chart-card"

/** Room kept above the tallest column for its count. */
const LABEL_ROOM = "1.25rem"

/**
 * Ordered bands as upright columns, so a distribution reads left to right as
 * a shape. Every band keeps its place, an empty one included.
 */
export function ColumnChart({ slices, label }: { slices: Slice[]; label: string }) {
  const largest = Math.max(1, ...slices.map((slice) => slice.count))

  return (
    <figure aria-label={label}>
      <div className="flex h-44 items-end gap-2 border-b border-neutral-300 sm:gap-3">
        {slices.map((slice) => (
          <div
            key={slice.label}
            title={describe(slice)}
            className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
          >
            <span className="mb-1 text-xs font-medium text-neutral-800 tabular-nums">
              {slice.count}
            </span>
            <div
              className="w-full max-w-10 rounded-t-[4px] transition-opacity hover:opacity-75"
              style={{
                height: `calc(${slice.count / largest} * (100% - ${LABEL_ROOM}))`,
                backgroundColor: SINGLE_SERIES,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2 sm:gap-3">
        {slices.map((slice) => (
          <span
            key={slice.label}
            className="min-w-0 flex-1 text-center text-[11px] leading-tight text-neutral-500"
          >
            {slice.label}
          </span>
        ))}
      </div>
    </figure>
  )
}

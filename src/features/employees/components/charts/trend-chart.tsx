import { SINGLE_SERIES } from "../../chart-colors"
import type { Slice } from "../../dashboard"

/** Share of the plot height kept free above the highest point for its count. */
const HEADROOM = 18

/**
 * A count per period as a line over time, so the direction of hiring reads at
 * a glance. Each point carries its count; with a handful of periods that is
 * the label, not clutter.
 */
export function TrendChart({ slices, label }: { slices: Slice[]; label: string }) {
  const largest = Math.max(1, ...slices.map((slice) => slice.count))
  const points = slices.map((slice, index) => ({
    slice,
    x: ((index + 0.5) / slices.length) * 100,
    y: 100 - (slice.count / largest) * (100 - HEADROOM),
  }))

  const line = points.map((point) => `${point.x},${point.y}`).join(" ")
  const first = points[0]
  const last = points[points.length - 1]
  const area = `M ${first.x} 100 L ${line.replaceAll(" ", " L ")} L ${last.x} 100 Z`

  return (
    <figure aria-label={label}>
      <div className="relative h-44 border-b border-neutral-300">
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        >
          <path d={area} style={{ fill: SINGLE_SERIES }} opacity={0.08} />
          <polyline
            points={line}
            fill="none"
            style={{ stroke: SINGLE_SERIES }}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {points.map(({ slice, x, y }) => (
          <div
            key={slice.label}
            title={`${slice.label}: ${slice.count} joined`}
            className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className="absolute bottom-full text-xs font-medium text-neutral-800 tabular-nums">
              {slice.count}
            </span>
            <span
              className="size-2.5 rounded-full ring-2 ring-white"
              style={{ backgroundColor: SINGLE_SERIES }}
            />
          </div>
        ))}
      </div>

      <div className="relative mt-2 h-4">
        {points.map(({ slice, x }) => (
          <span
            key={slice.label}
            className="absolute -translate-x-1/2 text-[11px] text-neutral-500"
            style={{ left: `${x}%` }}
          >
            {slice.label}
          </span>
        ))}
      </div>
    </figure>
  )
}

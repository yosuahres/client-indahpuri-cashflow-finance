import type { Slice } from "../../dashboard"
import { ChartLegend, describe } from "./chart-card"

const SIZE = 168
const STROKE = 24
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
/** The 2px surface gap the mark spec puts between touching fills. */
const GAP = 2

/**
 * A handful of groups as parts of one whole. The ring leaves its middle for
 * the total; the legend beside it carries every count, so no share has to be
 * judged from an arc.
 */
export function DonutChart({
  slices,
  colors,
  label,
  totalLabel,
}: {
  slices: Slice[]
  colors: Record<string, string>
  /** Describes the whole ring to assistive tech. */
  label: string
  /** Under the total in the middle: "people", "active". */
  totalLabel: string
}) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0)
  const gap = slices.length > 1 ? GAP : 0

  // Each arc starts where the previous one ended.
  const arcs = slices.map((slice, index) => ({
    slice,
    start: slices.slice(0, index).reduce((sum, earlier) => sum + earlier.share, 0) * CIRCUMFERENCE,
    length: Math.max(0, slice.share * CIRCUMFERENCE - gap),
  }))

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label}>
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {arcs.map(({ slice, start, length }) => (
              <circle
                key={slice.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={colors[slice.label]}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
                className="transition-opacity hover:opacity-75"
              >
                <title>{describe(slice)}</title>
              </circle>
            ))}
          </g>
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-neutral-900 tabular-nums">{total}</span>
          <span className="text-xs text-neutral-500">{totalLabel}</span>
        </div>
      </div>

      <ChartLegend slices={slices} colors={colors} className="w-full min-w-0 sm:flex-1" />
    </div>
  )
}

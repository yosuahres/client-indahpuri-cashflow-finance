"use client"

import { useState } from "react"

import { cn } from "@/lib/cn"
import { formatCurrency, formatPercent } from "@/lib/format"
import type { CategorySlice } from "./types"

const SIZE = 200
const CENTER = SIZE / 2
/** Leaves room for the 2px surface gap the mark spec puts between fills. */
const RADIUS = CENTER - 4

/** Polar to cartesian, with 0° at twelve o'clock so the pie opens at the top. */
function point(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180
  return [CENTER + radius * Math.cos(radians), CENTER + radius * Math.sin(radians)]
}

function slicePath(startAngle: number, sweep: number) {
  const [x1, y1] = point(startAngle, RADIUS)
  const [x2, y2] = point(startAngle + sweep, RADIUS)
  const largeArc = sweep > 180 ? 1 : 0

  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${x2} ${y2} Z`
}

/**
 * Part-to-whole split of one statement kind. The pie is the glance; the list
 * beside it carries the amount and share for every slice, so identity and
 * magnitude never rest on the fill color alone.
 */
export function CategoryPie({
  title,
  slices,
  emptyLabel,
}: {
  title: string
  slices: CategorySlice[]
  /** Shown instead of the pie when nothing was recorded in the range. */
  emptyLabel: string
}) {
  const [hovered, setHovered] = useState<string | null>(null)

  const total = slices.reduce((sum, slice) => sum + slice.value, 0)

  if (slices.length === 0 || total === 0) {
    return (
      <div>
        <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
        <p className="mt-3 text-sm text-neutral-500">{emptyLabel}</p>
      </div>
    )
  }

  // Each slice starts where the previous one ended.
  const wedges: { slice: CategorySlice; start: number; sweep: number }[] = []
  for (const slice of slices) {
    const previous = wedges[wedges.length - 1]
    wedges.push({
      slice,
      start: previous ? previous.start + previous.sweep : 0,
      sweep: slice.share * 360,
    })
  }

  return (
    <div>
      <h3 className="text-sm font-medium text-neutral-900">{title}</h3>

      <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-6">
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={`${title}, by category`}
          className="shrink-0"
          onPointerLeave={() => setHovered(null)}
        >
          {wedges.map(({ slice, start, sweep }) => {
            const dimmed = hovered !== null && hovered !== slice.label

            // A lone category fills the circle, which no single arc can express.
            const shape =
              wedges.length === 1 ? (
                <circle cx={CENTER} cy={CENTER} r={RADIUS} fill={slice.color} />
              ) : (
                <path d={slicePath(start, sweep)} fill={slice.color} />
              )

            return (
              <g
                key={slice.label}
                stroke="#ffffff"
                strokeWidth={2}
                opacity={dimmed ? 0.45 : 1}
                onPointerEnter={() => setHovered(slice.label)}
              >
                {shape}
                <title>{`${slice.label}: ${formatCurrency(slice.value)} (${formatPercent(slice.share)})`}</title>
              </g>
            )
          })}
        </svg>

        <dl className="min-w-64 flex-1">
          {slices.map((slice) => (
            <div
              key={slice.label}
              onPointerEnter={() => setHovered(slice.label)}
              onPointerLeave={() => setHovered(null)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5",
                hovered === slice.label && "bg-neutral-100",
              )}
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{ backgroundColor: slice.color }}
              />
              <dt className="min-w-0 flex-1 truncate text-sm text-neutral-600">
                {slice.label}
              </dt>
              <dd className="text-sm font-medium text-neutral-900 tabular-nums">
                {formatCurrency(slice.value)}
              </dd>
              <dd className="w-14 text-right text-sm text-neutral-500 tabular-nums">
                {formatPercent(slice.share)}
              </dd>
            </div>
          ))}

          <div className="mt-1 flex items-center gap-2.5 border-t border-black/8 px-2 pt-2.5">
            <span aria-hidden className="size-2.5 shrink-0" />
            <dt className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
              Total
            </dt>
            <dd className="text-sm font-semibold text-neutral-900 tabular-nums">
              {formatCurrency(total)}
            </dd>
            <dd className="w-14 text-right text-sm text-neutral-500 tabular-nums">
              {formatPercent(1)}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

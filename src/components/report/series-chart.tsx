"use client"

import { useState } from "react"

import { useElementWidth } from "@/hooks/use-element-size"
import { formatCompact, formatCurrency } from "@/lib/format"
import type { ChartSeries } from "./types"

const HEIGHT = 300
const MARGIN = { top: 16, right: 12, bottom: 36, left: 84 }

/** Mark specs from the design system. */
const MAX_BAR_WIDTH = 24
const BAR_GAP = 2
const CORNER_RADIUS = 4

const GRID = "#e8e8e6"
const AXIS_TEXT = "#6b6a66"

/** Rounds a raw step up to the nearest 1 / 2 / 5 × 10ⁿ so ticks land on clean numbers. */
function niceStep(raw: number) {
  if (raw <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const normalized = raw / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

function buildScale(values: number[]) {
  // The baseline is always zero — cash movements are read against "no change".
  const max = Math.max(0, ...values)
  const min = Math.min(0, ...values)

  // Nothing recorded yet: keep a readable axis so the chart still reads as a
  // chart, rather than every gridline stacking on one line.
  if (max === 0 && min === 0) {
    return { top: 5, bottom: 0, ticks: [0, 1, 2, 3, 4, 5] }
  }

  const step = niceStep((max - min) / 4 || 1)

  const top = Math.ceil(max / step) * step
  const bottom = Math.floor(min / step) * step

  const ticks: number[] = []
  for (let tick = bottom; tick <= top + step / 2; tick += step) {
    ticks.push(Math.round(tick))
  }
  return { top, bottom: bottom === top ? top - step : bottom, ticks }
}

/**
 * A column with its data-end rounded and its baseline end square, so the bar
 * visibly grows out of the zero line. Negative bars mirror it.
 */
function barPath(x: number, width: number, baselineY: number, valueY: number) {
  const height = Math.abs(valueY - baselineY)
  if (height < 0.5) return ""

  const radius = Math.min(CORNER_RADIUS, height, width / 2)
  const up = valueY < baselineY
  const direction = up ? 1 : -1
  // y just inside the data end, where the corner arc starts.
  const arcStart = valueY + radius * direction

  return [
    `M ${x} ${baselineY}`,
    `L ${x} ${arcStart}`,
    `Q ${x} ${valueY} ${x + radius} ${valueY}`,
    `L ${x + width - radius} ${valueY}`,
    `Q ${x + width} ${valueY} ${x + width} ${arcStart}`,
    `L ${x + width} ${baselineY}`,
    "Z",
  ].join(" ")
}

/**
 * Grouped bars against a zero baseline: one group per period, one bar per
 * series. Statement-agnostic — the caller supplies the labelled series.
 */
export function SeriesChart({
  periods,
  series,
  label,
}: {
  periods: string[]
  series: ChartSeries[]
  /** Describes the whole plot to assistive tech. */
  label: string
}) {
  const { ref, width } = useElementWidth<HTMLDivElement>()
  const [hovered, setHovered] = useState<number | null>(null)

  const plotWidth = Math.max(0, width - MARGIN.left - MARGIN.right)
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom

  const scale = buildScale(series.flatMap((entry) => entry.values))
  const toY = (value: number) =>
    MARGIN.top +
    ((scale.top - value) / (scale.top - scale.bottom)) * plotHeight

  const bandWidth = periods.length > 0 ? plotWidth / periods.length : 0
  // Cap the bar so the band always keeps some air, per the mark spec.
  const barWidth = Math.max(
    2,
    Math.min(
      MAX_BAR_WIDTH,
      (bandWidth * 0.62 - BAR_GAP * (series.length - 1)) / series.length,
    ),
  )
  const groupWidth = barWidth * series.length + BAR_GAP * (series.length - 1)
  const baselineY = toY(0)

  const tooltipLeft = hovered === null ? 0 : MARGIN.left + bandWidth * (hovered + 0.5)

  return (
    <div className="w-full">
      <div ref={ref} className="relative w-full" style={{ height: HEIGHT }}>
        {width > 0 ? (
          <svg
            width={width}
            height={HEIGHT}
            role="img"
            aria-label={label}
            onPointerLeave={() => setHovered(null)}
          >
            {/* Gridlines and value axis */}
            {scale.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={toY(tick)}
                  y2={toY(tick)}
                  stroke={tick === 0 ? "#c9c8c4" : GRID}
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
                <text
                  x={MARGIN.left - 10}
                  y={toY(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={AXIS_TEXT}
                >
                  {formatCompact(tick)}
                </text>
              </g>
            ))}

            {periods.map((period, periodIndex) => {
              const bandStart = MARGIN.left + bandWidth * periodIndex
              const groupStart = bandStart + (bandWidth - groupWidth) / 2

              return (
                <g key={period}>
                  {hovered === periodIndex ? (
                    <rect
                      x={bandStart}
                      y={MARGIN.top}
                      width={bandWidth}
                      height={plotHeight}
                      fill="#000000"
                      opacity={0.03}
                    />
                  ) : null}

                  {series.map((entry, seriesIndex) => {
                    const d = barPath(
                      groupStart + seriesIndex * (barWidth + BAR_GAP),
                      barWidth,
                      baselineY,
                      toY(entry.values[periodIndex]),
                    )
                    // A zero value draws nothing — skip the empty node entirely.
                    return d ? <path key={entry.key} d={d} fill={entry.color} /> : null
                  })}

                  <text
                    x={bandStart + bandWidth / 2}
                    y={HEIGHT - MARGIN.bottom + 20}
                    textAnchor="middle"
                    fontSize={11}
                    fill={AXIS_TEXT}
                  >
                    {period}
                  </text>

                  {/* Hit target spans the whole band, not just the painted bars. */}
                  <rect
                    x={bandStart}
                    y={MARGIN.top}
                    width={bandWidth}
                    height={plotHeight}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${period} detail`}
                    onPointerEnter={() => setHovered(periodIndex)}
                    onFocus={() => setHovered(periodIndex)}
                    onBlur={() => setHovered(null)}
                    className="outline-none focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-800"
                  />
                </g>
              )
            })}
          </svg>
        ) : null}

        {hovered !== null ? (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-72 -translate-x-1/2 rounded-lg border border-black/8 bg-white p-3 shadow-lg"
            style={{
              left: Math.min(Math.max(tooltipLeft, 152), Math.max(width - 152, 152)),
              top: MARGIN.top + 8,
            }}
          >
            <p className="mb-2 text-xs font-semibold text-neutral-900">
              {periods[hovered]}
            </p>
            <ul className="flex flex-col gap-1.5">
              {series.map((entry) => (
                <li key={entry.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-0.5 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="min-w-0 flex-1 truncate text-xs text-neutral-500">
                    {entry.shortLabel}
                  </span>
                  <span className="text-xs font-semibold text-neutral-900 tabular-nums">
                    {formatCurrency(entry.values[hovered])}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {/* Legend — identity never depends on color alone. */}
      <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {series.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 rounded-[3px]"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-neutral-600">{entry.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

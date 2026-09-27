import type { Slice } from "../../dashboard"
import { ChartLegend, describe } from "./chart-card"

const CELLS = 100

/**
 * Shares as whole squares out of a hundred, largest remainder first, so the
 * cells always add up to exactly one grid.
 */
function allot(slices: Slice[]): number[] {
  const exact = slices.map((slice) => slice.share * CELLS)
  const cells = exact.map(Math.floor)
  let left = CELLS - cells.reduce((sum, count) => sum + count, 0)

  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder)
  for (const { index } of byRemainder) {
    if (left <= 0) break
    cells[index] += 1
    left -= 1
  }
  return cells
}

/**
 * A two- or three-way split as a ten-by-ten grid, one square per percent:
 * a ratio people count rather than estimate from an angle.
 */
export function WaffleChart({
  slices,
  colors,
  label,
}: {
  slices: Slice[]
  colors: Record<string, string>
  label: string
}) {
  const cells = allot(slices).flatMap((count, index) =>
    Array.from({ length: count }, () => slices[index]),
  )

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <div
        role="img"
        aria-label={label}
        className="grid w-full max-w-[180px] shrink-0 grid-cols-10 gap-0.5"
      >
        {cells.map((slice, index) => (
          <span
            key={index}
            title={describe(slice)}
            className="aspect-square rounded-[3px]"
            style={{ backgroundColor: colors[slice.label] }}
          />
        ))}
      </div>

      <div className="w-full min-w-0 sm:flex-1">
        <ChartLegend slices={slices} colors={colors} />
        <p className="mt-2 text-xs text-neutral-400">Each square is 1% of them.</p>
      </div>
    </div>
  )
}

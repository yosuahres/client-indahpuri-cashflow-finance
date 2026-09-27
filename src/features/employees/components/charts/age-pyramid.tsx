import { GENDER_COLORS } from "../../chart-colors"
import type { AgeBand } from "../../dashboard"

/** The longest bar stops short of its half, leaving the count room beside it. */
const REACH = 0.82

/**
 * Age bands stacked oldest on top, men growing left and women right from a
 * shared spine — the population pyramid, which shows the age mix and the
 * gender mix of every band in one read.
 */
export function AgePyramid({ bands }: { bands: AgeBand[] }) {
  const largest = Math.max(1, ...bands.flatMap((entry) => [entry.male, entry.female]))
  const men = bands.reduce((sum, entry) => sum + entry.male, 0)
  const women = bands.reduce((sum, entry) => sum + entry.female, 0)
  const width = (count: number) => `${(count / largest) * REACH * 100}%`

  return (
    <figure aria-label="Active people by age band, men and women">
      <div className="mb-3 grid grid-cols-[1fr_4rem_1fr] text-xs text-neutral-600">
        <span className="flex items-center justify-end gap-1.5">
          Male <span className="font-medium text-neutral-900 tabular-nums">{men}</span>
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: GENDER_COLORS.Male }} />
        </span>
        <span />
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ backgroundColor: GENDER_COLORS.Female }} />
          Female <span className="font-medium text-neutral-900 tabular-nums">{women}</span>
        </span>
      </div>

      <div className="space-y-1.5">
        {[...bands].reverse().map((entry) => (
          <div key={entry.label} className="grid grid-cols-[1fr_4rem_1fr] items-center">
            <div
              title={`${entry.label}, male: ${entry.male}`}
              className="flex h-5 items-center justify-end gap-1.5"
            >
              <span className="text-xs text-neutral-700 tabular-nums">{entry.male}</span>
              <div
                className="h-full rounded-l-[4px] transition-opacity hover:opacity-75"
                style={{ width: width(entry.male), backgroundColor: GENDER_COLORS.Male }}
              />
            </div>
            <span className="text-center text-xs text-neutral-500">{entry.label}</span>
            <div
              title={`${entry.label}, female: ${entry.female}`}
              className="flex h-5 items-center gap-1.5"
            >
              <div
                className="h-full rounded-r-[4px] transition-opacity hover:opacity-75"
                style={{ width: width(entry.female), backgroundColor: GENDER_COLORS.Female }}
              />
              <span className="text-xs text-neutral-700 tabular-nums">{entry.female}</span>
            </div>
          </div>
        ))}
      </div>
    </figure>
  )
}

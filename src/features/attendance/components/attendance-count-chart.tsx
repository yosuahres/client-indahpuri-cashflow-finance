import { Card, CardEmpty, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/cn"
import type { DayCount } from "../shift-dashboard"
import { ATTENDANCE_STATUSES, type AttendanceStatusValue } from "../constants"

/**
 * Fills for the stacked days. Each is also named in the legend and in every
 * column's accessible label, so the colour is never the only thing carrying
 * which status a segment is.
 */
const FILLS: Record<AttendanceStatusValue, string> = {
  present: "bg-emerald-500",
  late: "bg-amber-500",
  absent: "bg-rose-500",
  leave: "bg-sky-500",
  holiday: "bg-neutral-300",
}

const PLOT_HEIGHT = 160

/**
 * Days recorded across the month, one stacked column per day. A column's
 * height is how many people were recorded that day, so a gap is a day nobody
 * took the roll on — which is worth seeing, not smoothing over.
 */
export function AttendanceCountChart({ days }: { days: DayCount[] }) {
  const tallest = Math.max(1, ...days.map((day) => day.total))
  const recorded = days.reduce((total, day) => total + day.total, 0)

  return (
    <Card variant="flat" className="min-w-0">
      <CardHeader
        variant="flat"
        title="Attendance Count"
        caption="People recorded each day this month. An empty day is one the roll was not taken on."
      />

      <div className="px-4 pt-4 pb-4">
        {recorded === 0 ? (
          <CardEmpty label="Nothing recorded this month yet." />
        ) : (
          <>
            <div
              className="flex items-end gap-[3px] overflow-x-auto"
              style={{ height: PLOT_HEIGHT }}
            >
              {days.map((day) => {
                const label = ATTENDANCE_STATUSES.filter((status) => day.counts[status.value])
                  .map((status) => `${day.counts[status.value]} ${status.label.toLowerCase()}`)
                  .join(", ")

                return (
                  <div
                    key={day.date}
                    className="flex min-w-[8px] flex-1 flex-col justify-end"
                    title={`${day.date}: ${label || "nothing recorded"}`}
                  >
                    <div
                      role="img"
                      aria-label={`${day.date}: ${label || "nothing recorded"}`}
                      className="flex w-full flex-col-reverse overflow-hidden rounded-sm"
                      style={{ height: `${(day.total / tallest) * 100}%` }}
                    >
                      {ATTENDANCE_STATUSES.map((status) =>
                        day.counts[status.value] ? (
                          <div
                            key={status.value}
                            className={cn("w-full", FILLS[status.value])}
                            style={{ height: `${(day.counts[status.value] / day.total) * 100}%` }}
                          />
                        ) : null,
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Only the ends are labelled: a tick under all thirty-one would be
                unreadable, and the tooltip carries the exact day. */}
            <div className="mt-1.5 flex justify-between text-xs text-neutral-400">
              <span>{days[0]?.date.slice(-2)}</span>
              <span>{days[days.length - 1]?.date.slice(-2)}</span>
            </div>

            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
              {ATTENDANCE_STATUSES.map((status) => (
                <li key={status.value} className="flex items-center gap-1.5 text-xs text-neutral-600">
                  <span className={cn("size-2.5 shrink-0 rounded-sm", FILLS[status.value])} />
                  {status.label}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  )
}

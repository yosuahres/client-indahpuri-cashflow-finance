import { Card, CardEmpty, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/cn"
import { formatCompact, formatCurrency } from "@/lib/format"
import { shortMonthName } from "@/features/reporting/months"

import type { RunTotal } from "../dashboard"

const PLOT_HEIGHT = 160

/**
 * Net pay month by month over the past year, one column a month. A draft is
 * drawn lighter than a final month, as its figures can still change; a month
 * nobody ran payroll for is left empty rather than drawn as zero.
 */
export function NetPayTrend({ trend, selected }: { trend: RunTotal[]; selected: string }) {
  const tallest = Math.max(1, ...trend.map((entry) => entry.netPay))
  const anyRun = trend.some((entry) => entry.status)

  return (
    <Card variant="flat" className="min-w-0">
      <CardHeader
        variant="flat"
        title="Net Pay by Month"
        caption="What was transferred each month over the past year. Lighter columns are drafts."
      />

      <div className="px-4 pt-4 pb-4">
        {!anyRun ? (
          <CardEmpty label="No payroll saved in the past year yet." />
        ) : (
          <>
            <div className="flex items-end gap-1.5 sm:gap-2" style={{ height: PLOT_HEIGHT }}>
              {trend.map((entry) => {
                const month = Number(entry.period.slice(5, 7))
                const year = entry.period.slice(0, 4)
                const label = entry.status
                  ? `${shortMonthName(month)} ${year}: ${formatCurrency(entry.netPay)} for ${entry.people} ${entry.people === 1 ? "person" : "people"}${entry.status === "draft" ? " (draft)" : ""}`
                  : `${shortMonthName(month)} ${year}: not run`

                return (
                  <div key={entry.period} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={label}>
                    {entry.status ? (
                      <span className="mb-1 hidden text-center text-[10px] text-neutral-500 tabular-nums sm:block">
                        {formatCompact(entry.netPay)}
                      </span>
                    ) : null}
                    <div
                      role="img"
                      aria-label={label}
                      className={cn(
                        "w-full rounded-sm",
                        !entry.status
                          ? "h-0.5 bg-neutral-200"
                          : entry.status === "final"
                            ? "bg-neutral-800"
                            : "bg-neutral-400",
                        entry.period === selected && "ring-2 ring-neutral-900 ring-offset-2",
                      )}
                      style={entry.status ? { height: `${Math.max(2, (entry.netPay / tallest) * 100)}%` } : undefined}
                    />
                  </div>
                )
              })}
            </div>

            <div className="mt-1.5 flex gap-1.5 sm:gap-2">
              {trend.map((entry) => (
                <span key={entry.period} className="min-w-0 flex-1 truncate text-center text-[10px] text-neutral-400 sm:text-xs">
                  {shortMonthName(Number(entry.period.slice(5, 7)))}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}

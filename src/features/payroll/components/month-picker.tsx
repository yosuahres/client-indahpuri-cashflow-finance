"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/cn"
import { longMonthName, stepMonth } from "@/features/reporting/months"

const STEP =
  "grid size-10 shrink-0 cursor-pointer place-items-center rounded-md bg-neutral-100 text-neutral-600 hover:text-neutral-900"

/**
 * Which month the payroll sheet pays. It sits in the URL, so a month is
 * shareable and the sheet comes back from the server already filled.
 */
export function MonthPicker({
  year,
  month,
  current,
}: {
  year: number
  month: number
  /** This month, for the way back to it. */
  current: { year: number; month: number }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function go(to: { year: number; month: number }) {
    const params = new URLSearchParams(searchParams)
    params.set("year", String(to.year))
    params.set("month", String(to.month))
    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false })
    })
  }

  const onCurrent = year === current.year && month === current.month

  return (
    <div className={cn("flex items-center gap-2 px-4 py-3 sm:px-6", pending && "opacity-60")}>
      <button
        type="button"
        onClick={() => go(stepMonth(year, month, -1))}
        aria-label="Previous month"
        className={STEP}
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
      </button>
      <span className="min-w-36 text-center text-sm font-medium text-neutral-900 tabular-nums">
        {longMonthName(month)} {year}
      </span>
      <button
        type="button"
        onClick={() => go(stepMonth(year, month, 1))}
        aria-label="Next month"
        className={STEP}
      >
        <ChevronRight className="size-4" strokeWidth={2} />
      </button>

      {!onCurrent ? (
        <button
          type="button"
          onClick={() => go(current)}
          className="ml-1 shrink-0 cursor-pointer rounded-md px-2.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        >
          This month
        </button>
      ) : null}
    </div>
  )
}

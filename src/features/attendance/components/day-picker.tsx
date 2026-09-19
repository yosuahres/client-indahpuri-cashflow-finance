"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { DatePicker } from "@/components/form/date-picker"
import { cn } from "@/lib/cn"

const STEP = "grid size-10 shrink-0 cursor-pointer place-items-center rounded-md bg-neutral-100 text-neutral-600 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-40"

/** The same date shifted by whole days, still as `YYYY-MM-DD`. */
function shift(date: string, days: number) {
  const moved = new Date(`${date}T00:00:00Z`)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

/**
 * Which day the sheet is taking. The date sits in the URL, so a day is
 * shareable and the rows come back filtered from the server.
 */
export function DayPicker({ date, today }: { date: string; today: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function setDate(value: string) {
    const params = new URLSearchParams(searchParams)
    params.set("date", value)
    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false })
    })
  }

  return (
    <div className={cn("flex items-center gap-2 px-4 py-3 sm:px-6", pending && "opacity-60")}>
      <button
        type="button"
        onClick={() => setDate(shift(date, -1))}
        aria-label="Previous day"
        className={STEP}
      >
        <ChevronLeft className="size-4" strokeWidth={2} />
      </button>

      <div className="w-full sm:w-52">
        <label htmlFor="attendance-date" className="sr-only">
          Date
        </label>
        {/* Not inside a form — the control drives the URL, so its hidden
            input is inert and the name only satisfies the component. */}
        <DatePicker
          id="attendance-date"
          name="date"
          value={date}
          onValueChange={setDate}
          today={today}
        />
      </div>

      <button
        type="button"
        onClick={() => setDate(shift(date, 1))}
        aria-label="Next day"
        className={STEP}
      >
        <ChevronRight className="size-4" strokeWidth={2} />
      </button>

      {date !== today ? (
        <button
          type="button"
          onClick={() => setDate(today)}
          className="ml-1 shrink-0 cursor-pointer rounded-md px-2.5 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
        >
          Today
        </button>
      ) : null}
    </div>
  )
}

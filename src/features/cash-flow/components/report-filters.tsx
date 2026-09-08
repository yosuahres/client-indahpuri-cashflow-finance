"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { DatePicker } from "@/components/form/date-picker"
import { Select } from "@/components/form/select"
import { cn } from "@/lib/cn"
import { PERIODICITIES } from "../constants"

const control =
  "h-10 w-full rounded-md bg-neutral-100 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800"

const YEAR_SPAN = 5

export function ReportFilters({
  company,
  mode,
  fromYear,
  toYear,
  from,
  to,
  periodicity,
  today,
}: {
  company: string
  mode: "fiscal" | "range"
  fromYear: number
  toYear: number
  from: string
  to: string
  periodicity: string
  today: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  /** Filters live in the URL so the report stays shareable and re-renders on the server. */
  function setParams(entries: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(entries)) params.set(key, value)
    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false })
    })
  }

  const currentYear = Number(today.slice(0, 4))
  const years = Array.from({ length: YEAR_SPAN * 2 + 1 }, (_, index) =>
    String(currentYear - YEAR_SPAN + index),
  )

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 px-6 py-4 md:grid-cols-3 lg:grid-cols-6",
        pending && "opacity-60",
      )}
    >
      <input
        aria-label="Company"
        className={control}
        defaultValue={company}
        onBlur={(event) => setParams({ company: event.target.value })}
      />
      <Select
        id="period-mode"
        value={mode}
        onValueChange={(value) => setParams({ mode: value })}
        options={[
          { value: "fiscal", label: "Fiscal Year" },
          { value: "range", label: "Date Range" },
        ]}
      />

      {/* The two controls beside the mode follow whichever mode is chosen. */}
      {mode === "fiscal" ? (
        <>
          <Select
            id="from-year"
            value={String(fromYear)}
            onValueChange={(value) => setParams({ fromYear: value })}
            options={years.map((year) => ({ value: year, label: year }))}
          />
          <Select
            id="to-year"
            value={String(toYear)}
            onValueChange={(value) => setParams({ toYear: value })}
            options={years.map((year) => ({ value: year, label: year }))}
          />
        </>
      ) : (
        <>
          <DatePicker
            id="from-date"
            name="from"
            value={from}
            onValueChange={(value) => setParams({ from: value })}
            today={today}
          />
          <DatePicker
            id="to-date"
            name="to"
            value={to}
            onValueChange={(value) => setParams({ to: value })}
            today={today}
          />
        </>
      )}

      <Select
        id="periodicity"
        value={periodicity}
        onValueChange={(value) => setParams({ periodicity: value })}
        options={PERIODICITIES.map((option) => ({ value: option, label: option }))}
      />

      <Select
        id="currency"
        value="IDR"
        onValueChange={() => {}}
        options={[
          { value: "IDR", label: "IDR" },
          { value: "USD", label: "USD" },
        ]}
      />
    </div>
  )
}

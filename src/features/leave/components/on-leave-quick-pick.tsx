"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

import { cn } from "@/lib/cn"

import { addDays } from "../constants"

/**
 * One-tap "who is off today / tomorrow". Sets the same `on` key as the date in
 * the Filters panel, so any other day is a pick away there; tapping the lit
 * button again clears it.
 */
export function OnLeaveQuickPick({ on, today }: { on: string; today: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const tomorrow = addDays(today, 1)

  function pick(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value && value !== on) params.set("on", value)
    else params.delete("on")
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  const options = [
    { value: today, label: "Today" },
    { value: tomorrow, label: "Tomorrow" },
  ]

  return (
    <div
      role="group"
      aria-label="Who is on leave"
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-xl border border-black/10 p-0.5 sm:h-8",
        pending && "opacity-60",
      )}
    >
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => pick(option.value)}
          aria-pressed={on === option.value}
          className={cn(
            "h-full cursor-pointer rounded-[10px] px-2.5 text-sm font-medium transition-colors",
            on === option.value
              ? "bg-neutral-900 text-white"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

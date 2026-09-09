"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/cn"
import { popoverContainer, usePopoverPosition } from "./use-popover"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

// Indonesia starts the week on Monday.
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]

const pad = (value: number) => String(value).padStart(2, "0")

export const toISO = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`

function parseISO(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  return { year: Number(year), month: Number(month) - 1, day: Number(day) }
}

/** dd/mm/yyyy — formatted by hand so server and client always agree. */
function formatDisplay(value: string) {
  const parsed = parseISO(value)
  if (!parsed) return ""
  return `${pad(parsed.day)}/${pad(parsed.month + 1)}/${parsed.year}`
}

const daysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate()

/** Weekday of the 1st, shifted so Monday is 0. */
function firstWeekday(year: number, month: number) {
  return (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7
}

function addDays(value: string, delta: number) {
  const parsed = parseISO(value)
  if (!parsed) return value
  const date = new Date(Date.UTC(parsed.year, parsed.month, parsed.day + delta))
  return toISO(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function addMonths(value: string, delta: number) {
  const parsed = parseISO(value)
  if (!parsed) return value
  const day = Math.min(parsed.day, daysInMonth(parsed.year, parsed.month + delta))
  const date = new Date(Date.UTC(parsed.year, parsed.month + delta, day))
  return toISO(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

export function DatePicker({
  id,
  name,
  value,
  onValueChange,
  today,
  invalid,
}: {
  id: string
  name: string
  /** ISO `YYYY-MM-DD`. */
  value: string
  onValueChange: (value: string) => void
  /** Today's date from the server, so "Today" does not depend on the client clock. */
  today: string
  invalid?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(value || today)
  const rootRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const popoverStyle = usePopoverPosition(triggerRef, open, 360, 288)
  // Resolved when opening: reading a ref during render is not safe.
  const [container, setContainer] = useState<HTMLElement | null>(null)

  function openCalendar() {
    setContainer(popoverContainer(triggerRef.current))
    setOpen(true)
  }

  const cursor = parseISO(focused) ?? parseISO(today)!

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      // The calendar lives outside this subtree now, so check it separately.
      if (rootRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // Start each opening on the selected day. Adjusted during render so the
  // calendar never paints on the wrong month first.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setFocused(value || today)
  }

  // Moving focus is a DOM concern, so it stays in an effect.
  useEffect(() => {
    if (!open) return
    gridRef.current?.querySelector<HTMLButtonElement>('[data-focused="true"]')?.focus()
  }, [open, focused])

  function onGridKeyDown(event: React.KeyboardEvent) {
    const dayMoves: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
    }
    if (event.key in dayMoves) {
      event.preventDefault()
      setFocused((current) => addDays(current, dayMoves[event.key]))
      return
    }
    if (event.key === "PageUp" || event.key === "PageDown") {
      event.preventDefault()
      setFocused((current) => addMonths(current, event.key === "PageUp" ? -1 : 1))
      return
    }
    if (event.key === "Escape") {
      setOpen(false)
    }
  }

  function pick(iso: string) {
    onValueChange(iso)
    setOpen(false)
  }

  const total = daysInMonth(cursor.year, cursor.month)
  const leading = firstWeekday(cursor.year, cursor.month)

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={value} />

      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onClick={() => (open ? setOpen(false) : openCalendar())}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-md bg-neutral-100 px-3 text-left text-base sm:text-sm",
          "focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800",
          invalid && "outline-2 outline-rose-500",
          value ? "font-medium text-neutral-900" : "text-neutral-400",
        )}
      >
        <span className="flex-1">{value ? formatDisplay(value) : "dd/mm/yyyy"}</span>
        <CalendarDays className="size-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
      </button>

      {open && container
        ? createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Choose a date"
          style={popoverStyle}
          className="z-[100] overflow-y-auto rounded-lg border border-black/10 bg-white p-3 shadow-lg"
        >
          <div className="mb-2 flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => setFocused((current) => addMonths(current, -1))}
              className="grid size-7 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100"
            >
              <ChevronLeft className="size-4" strokeWidth={2} />
            </button>
            <span aria-live="polite" className="flex-1 text-center text-sm font-semibold text-neutral-900">
              {MONTHS[cursor.month]} {cursor.year}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => setFocused((current) => addMonths(current, 1))}
              className="grid size-7 place-items-center rounded-md text-neutral-600 hover:bg-neutral-100"
            >
              <ChevronRight className="size-4" strokeWidth={2} />
            </button>
          </div>

          <div aria-hidden className="grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="grid h-7 place-items-center text-xs text-neutral-500">
                {weekday}
              </span>
            ))}
          </div>

          <div ref={gridRef} onKeyDown={onGridKeyDown} className="grid grid-cols-7 gap-0.5">
            {Array.from({ length: leading }, (_, index) => (
              <span key={`blank-${index}`} />
            ))}
            {Array.from({ length: total }, (_, index) => {
              const day = index + 1
              const iso = toISO(cursor.year, cursor.month, day)
              const isSelected = iso === value
              const isFocused = iso === focused
              return (
                <button
                  key={iso}
                  type="button"
                  data-focused={isFocused}
                  tabIndex={isFocused ? 0 : -1}
                  aria-pressed={isSelected}
                  aria-label={formatDisplay(iso)}
                  aria-current={iso === today ? "date" : undefined}
                  onClick={() => pick(iso)}
                  onFocus={() => setFocused(iso)}
                  className={cn(
                    "grid h-8 place-items-center rounded-md text-sm outline-none",
                    "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-neutral-800",
                    isSelected
                      ? "bg-neutral-900 font-semibold text-white"
                      : "text-neutral-800 hover:bg-neutral-100",
                    !isSelected && iso === today && "font-semibold text-neutral-900 underline",
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>

          <div className="mt-2 flex justify-between border-t border-black/8 pt-2">
            <button
              type="button"
              onClick={() => pick(today)}
              className="rounded px-2 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
            >
              Close
            </button>
          </div>
        </div>,
            container,
          )
        : null}
    </div>
  )
}

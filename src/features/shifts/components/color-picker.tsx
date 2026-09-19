"use client"

import { Check } from "lucide-react"

import { cn } from "@/lib/cn"

import { SHIFT_COLORS } from "../constants"

/**
 * The roster colour, as swatches rather than a dropdown — the choice is the
 * colour itself, so showing it beats naming it. Each swatch still carries its
 * name for anyone who cannot tell them apart by sight.
 */
export function ColorPicker({
  name,
  value,
  onValueChange,
}: {
  name: string
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <>
      <input type="hidden" name={name} value={value} />
      <div role="radiogroup" aria-label="Roster colour" className="flex flex-wrap gap-2">
        {SHIFT_COLORS.map((color) => {
          const selected = color.value === value
          return (
            <button
              key={color.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onValueChange(color.value)}
              title={color.label}
              className={cn(
                "grid size-9 cursor-pointer place-items-center rounded-md text-white transition-transform",
                color.swatch,
                selected
                  ? "ring-2 ring-neutral-900 ring-offset-2"
                  : "hover:scale-105 focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2",
              )}
            >
              {selected ? <Check className="size-4" strokeWidth={3} /> : null}
              <span className="sr-only">{color.label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}

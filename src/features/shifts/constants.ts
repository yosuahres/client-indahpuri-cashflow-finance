/**
 * The roster colours a shift can wear. A fixed set rather than a free colour,
 * so the app draws every shift from its own palette and a roster stays
 * legible — and so the value can be checked in the database (0028 §1).
 *
 * `swatch` fills the marker; `chip` carries the name on a tinted background,
 * which is what keeps the colour from being the only thing telling two shifts
 * apart.
 */
export type ShiftColorValue =
  | "blue"
  | "green"
  | "amber"
  | "rose"
  | "violet"
  | "cyan"
  | "orange"
  | "slate"

export const SHIFT_COLORS: {
  value: ShiftColorValue
  label: string
  swatch: string
  chip: string
}[] = [
  { value: "blue", label: "Blue", swatch: "bg-blue-500", chip: "bg-blue-50 text-blue-700" },
  { value: "green", label: "Green", swatch: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  { value: "amber", label: "Amber", swatch: "bg-amber-500", chip: "bg-amber-50 text-amber-800" },
  { value: "rose", label: "Rose", swatch: "bg-rose-500", chip: "bg-rose-50 text-rose-700" },
  { value: "violet", label: "Violet", swatch: "bg-violet-500", chip: "bg-violet-50 text-violet-700" },
  { value: "cyan", label: "Cyan", swatch: "bg-cyan-500", chip: "bg-cyan-50 text-cyan-700" },
  { value: "orange", label: "Orange", swatch: "bg-orange-500", chip: "bg-orange-50 text-orange-800" },
  { value: "slate", label: "Slate", swatch: "bg-slate-500", chip: "bg-slate-100 text-slate-700" },
]

const FALLBACK = SHIFT_COLORS[0]

export function shiftColor(value: string) {
  return SHIFT_COLORS.find((color) => color.value === value) ?? FALLBACK
}

export function isShiftColor(value: string): value is ShiftColorValue {
  return SHIFT_COLORS.some((color) => color.value === value)
}

/** `HH:MM` on a 24-hour clock. */
export const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * How long a shift runs, in whole minutes. An end earlier than the start is a
 * shift that crosses midnight, which the resort works — so it wraps rather
 * than being treated as a mistake.
 */
export function shiftMinutes(startsAt: string, endsAt: string): number {
  const [startH, startM] = startsAt.split(":").map(Number)
  const [endH, endM] = endsAt.split(":").map(Number)
  if ([startH, startM, endH, endM].some(Number.isNaN)) return 0
  let minutes = endH * 60 + endM - (startH * 60 + startM)
  if (minutes <= 0) minutes += 24 * 60
  return minutes
}

/** "08:00 – 17:00 · 9h" for a shift's line in a list. */
export function shiftHours(startsAt: string, endsAt: string): string {
  const minutes = shiftMinutes(startsAt, endsAt)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `${hours}h` : `${hours}h ${String(rest).padStart(2, "0")}m`
}

/** True when the shift runs past midnight — worth saying so on screen. */
export function crossesMidnight(startsAt: string, endsAt: string): boolean {
  return endsAt <= startsAt
}

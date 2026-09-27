import { CATEGORICAL } from "@/components/report/palette"

const [blue, orange, aqua, yellow, magenta, , violet] = CATEGORICAL

/**
 * Colour follows the group, never its rank: PKWT stays aqua whether it is the
 * biggest contract type or the smallest. Each set keeps neighbours that were
 * validated against each other (worst adjacent CVD ΔE 9.1).
 */
export const GENDER_COLORS: Record<string, string> = { Male: blue, Female: orange }

export const EMPLOYMENT_COLORS: Record<string, string> = {
  PKWTT: violet,
  PKWT: aqua,
  "Daily Worker": yellow,
  Consultant: magenta,
}

export const STATUS_COLORS: Record<string, string> = {
  Active: aqua,
  Inactive: yellow,
  Suspended: magenta,
  Left: violet,
}

/** A lone series needs no hue of its own: the card's title already names it. */
export const SINGLE_SERIES = "var(--color-neutral-800)"

import type { Shift } from "@/features/shifts/actions"

/**
 * The values the form should open on, coming back from adding a department or
 * a shift. Both redirect here naming what they created, so the thing someone
 * just went off to make is already picked when they land.
 *
 * A department is stored by name, so it carries straight over. A shift is
 * stored by id, so the name in the URL is looked up against the list.
 */
export function openOn(
  params: Record<string, string | string[] | undefined>,
  shifts: Shift[],
): Record<string, string> {
  const preset: Record<string, string> = {}

  if (typeof params.department === "string") preset.department = params.department

  if (typeof params.shift === "string") {
    const made = shifts.find((shift) => shift.name === params.shift)
    if (made) preset.shift = made.id
  }

  return preset
}

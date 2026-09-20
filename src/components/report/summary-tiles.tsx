import { Card, type CardVariant } from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/cn"

/** Tailwind needs whole class names, so the column count maps to a literal. */
const COLUMNS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
}

export type SummaryTile = {
  label: string
  value: number
  description?: string
  /** Forces the figure red regardless of sign — for the headline number. */
  tone?: "red"
}

/**
 * KPI row. A handful of headline numbers is a stat tile row, not a chart —
 * any trend belongs in the plots below. One card per tile, side by side from
 * `sm` up and stacked below it, rather than wrapping a rupiah figure.
 *
 * The figures keep the font's proportional digits: `tabular-nums` is for
 * columns that must align, and only makes a display-size number look loose.
 */
export function SummaryTiles({
  tiles,
  variant = "raised",
}: {
  tiles: SummaryTile[]
  variant?: CardVariant
}) {
  const flat = variant === "flat"

  return (
    <dl className={cn("grid gap-4", COLUMNS[tiles.length] ?? "grid-cols-2 sm:grid-cols-4")}>
      {tiles.map((tile) => (
        <Card key={tile.label} variant={variant} className={flat ? "px-4 py-3.5" : "px-4 py-4 sm:px-5 sm:py-5"}>
          <dt className={flat ? "text-sm font-medium text-neutral-800" : "text-sm text-neutral-500"}>
            {tile.label}
          </dt>
          <dd
            className={cn(
              flat ? "mt-1.5 text-xl font-semibold" : "mt-1.5 text-xl font-semibold sm:text-2xl",
              tile.tone === "red" || tile.value < 0
                ? "text-rose-600"
                : flat
                  ? "text-neutral-800"
                  : "text-neutral-900",
            )}
          >
            {formatCurrency(tile.value)}
            {tile.description ? (
              <span className="mt-1 block text-xs font-normal text-neutral-400">
                {tile.description}
              </span>
            ) : null}
          </dd>
        </Card>
      ))}
    </dl>
  )
}

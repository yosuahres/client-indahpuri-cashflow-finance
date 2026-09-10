import { Card } from "@/components/ui/card"
import { formatCurrencyWhole } from "@/lib/format"
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
export function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <dl className={cn("grid gap-4", COLUMNS[tiles.length] ?? "grid-cols-2 sm:grid-cols-4")}>
      {tiles.map((tile) => (
        <Card key={tile.label} className="px-4 py-4 sm:px-5 sm:py-5">
          <dt className="text-sm text-neutral-500">{tile.label}</dt>
          <dd
            className={cn(
              "mt-1.5 text-xl font-semibold sm:text-2xl",
              tile.tone === "red" || tile.value < 0 ? "text-rose-600" : "text-neutral-900",
            )}
          >
            {formatCurrencyWhole(tile.value)}
          </dd>
        </Card>
      ))}
    </dl>
  )
}

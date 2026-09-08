import { formatCurrency } from "@/lib/format"
import { cn } from "@/lib/cn"

/** Tailwind needs whole class names, so the column count maps to a literal. */
const COLUMNS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
}

export type SummaryTile = {
  label: string
  value: number
  /** Forces the figure red regardless of sign — for the headline number. */
  tone?: "red"
}

/**
 * KPI row. A handful of headline numbers is a stat tile row, not a chart —
 * any trend belongs in the plot below. The tiles always sit on one line.
 */
export function SummaryTiles({ tiles }: { tiles: SummaryTile[] }) {
  return (
    <dl
      className={cn(
        "grid gap-x-6 border-b border-black/8 px-6 py-8",
        COLUMNS[tiles.length] ?? "grid-cols-4",
      )}
    >
      {tiles.map((tile) => (
        <div key={tile.label} className="text-center">
          <dt className="text-sm text-neutral-500">{tile.label}</dt>
          <dd
            className={cn(
              "mt-1.5 text-2xl font-semibold tabular-nums",
              tile.tone === "red" || tile.value < 0 ? "text-rose-600" : "text-neutral-900",
            )}
          >
            {formatCurrency(tile.value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

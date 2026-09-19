import { Card } from "@/components/ui/card"
import { cn } from "@/lib/cn"

/** Tailwind needs whole class names, so the column count maps to a literal. */
const COLUMNS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
}

export type StatTile = {
  label: string
  /** Already formatted — a headcount, a rupiah figure, whatever the tile counts. */
  value: string
  description?: string
}

/**
 * The headline figures, one card each. Counts rather than money, so unlike the
 * finance tiles nothing here is ever red: a headcount has no bad sign.
 */
export function StatTiles({ tiles }: { tiles: StatTile[] }) {
  return (
    <dl className={cn("grid gap-4", COLUMNS[tiles.length] ?? "grid-cols-2 sm:grid-cols-4")}>
      {tiles.map((tile) => (
        <Card key={tile.label} variant="flat" className="px-4 py-3.5">
          <dt className="text-sm font-medium text-neutral-800">{tile.label}</dt>
          <dd className="mt-1.5 text-xl font-semibold text-neutral-800">
            {tile.value}
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

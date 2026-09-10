import { cn } from "@/lib/cn"

/**
 * Stand-in for content still on its way.
 *
 * These exist so a page can be sent in two parts: the chrome and the filters
 * go out with the first flush, and the figures replace these as soon as the
 * database answers. What they are shaped like matters — each one holds the
 * space its real content will take, so nothing jumps when it lands.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded-md bg-neutral-200/70", className)}
    />
  )
}

/** Covers a whole streamed region, and says so for anyone not watching it. */
export function LoadingRegion({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"

/**
 * Below this the sheet stops being readable, so the frame gives up and scrolls
 * instead. In practice only a month with dozens of categories on a short laptop
 * window gets anywhere near it.
 */
const FLOOR = 0.4

/** Layout is only roughly linear in the zoom factor, so it takes a few passes. */
const PASSES = 6

/**
 * Shrinks its children until the whole thing fits the space it was given, so
 * the report reads as one sheet at any desktop size rather than something you
 * scroll through. Never enlarges: at 1 the sheet is already at its design size.
 *
 * `zoom` rather than `transform: scale` because zoom takes part in layout — the
 * table reflows into the full width at the smaller size instead of leaving a
 * scaled-down block with dead space beside it.
 */
export function FitToFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const frame = useRef<HTMLDivElement>(null)
  const sheet = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const outer = frame.current
    const inner = sheet.current
    if (!outer || !inner) return

    let queued = 0

    const fit = () => {
      queued = 0
      const available = outer.clientHeight
      inner.style.setProperty("zoom", "1")
      if (available <= 0) return

      let zoom = 1
      for (let pass = 0; pass < PASSES; pass += 1) {
        // Post-zoom pixels, so it compares directly against the frame.
        const height = inner.getBoundingClientRect().height
        // Anything that would rather scroll sideways than wrap — the table.
        let widest = 1
        for (const node of inner.querySelectorAll<HTMLElement>("[data-fit-wide]")) {
          if (node.scrollWidth > node.clientWidth && node.clientWidth > 0) {
            widest = Math.min(widest, node.clientWidth / node.scrollWidth)
          }
        }

        const needed = Math.min(height > 0 ? available / height : 1, widest)
        // A hair under 1 is the content already fitting; leave it alone.
        if (needed >= 0.999) break

        zoom = Math.max(FLOOR, zoom * needed)
        inner.style.setProperty("zoom", String(zoom))
        if (zoom === FLOOR) break
      }
    }

    const schedule = () => {
      if (queued) return
      queued = requestAnimationFrame(fit)
    }

    fit()

    // Only the frame is watched: re-measuring the sheet would see its own zoom.
    const observer = new ResizeObserver(schedule)
    observer.observe(outer)
    // Fonts land after first paint and change every row height.
    document.fonts?.ready.then(schedule).catch(() => {})

    return () => {
      observer.disconnect()
      if (queued) cancelAnimationFrame(queued)
    }
  }, [])

  return (
    <div ref={frame} className={className}>
      <div ref={sheet}>{children}</div>
    </div>
  )
}

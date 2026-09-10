"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

/** Rows kept rendered beyond each edge, so a flick does not outrun the fill. */
const OVERSCAN = 8

/** The nearest ancestor that actually scrolls, or null for the page itself. */
function scrollParent(node: HTMLElement | null): HTMLElement | null {
  for (let current = node?.parentElement ?? null; current; current = current.parentElement) {
    const { overflowY } = getComputedStyle(current)
    if (overflowY === "auto" || overflowY === "scroll") return current
  }
  return null
}

export type RowWindow = {
  /** First row to render. */
  start: number
  /** One past the last row to render. */
  end: number
  /** Height standing in for the rows before `start`, in pixels. */
  padTop: number
  /** Height standing in for the rows after `end`, in pixels. */
  padBottom: number
}

/**
 * Renders only the rows on screen, holding the rest open with two spacers.
 *
 * A ledger of several thousand entries costs more in the browser than in the
 * database: every row is markup to parse, nodes to lay out and state to
 * hydrate, all of it for rows nobody has scrolled to. This keeps the full list
 * in memory — so a total, a count or a select-all still sees every row — and
 * only puts the visible slice in the DOM.
 *
 * Returns null below `threshold`, where the list is short enough that
 * windowing would only add machinery: the caller then renders every row and
 * heights stay natural.
 *
 * The measurement is taken from the list's own rectangle rather than from a
 * running scroll offset. The two spacers always add up to the same total
 * height, so that rectangle does not move as the window slides, which makes
 * this correct no matter what sits above the list or which ancestor scrolls.
 */
export function useWindowedRows({
  ref,
  count,
  rowHeight,
  threshold,
}: {
  ref: RefObject<HTMLElement | null>
  count: number
  rowHeight: number
  threshold: number
}): RowWindow | null {
  const active = count > threshold
  const [visible, setVisible] = useState<RowWindow | null>(null)
  const frame = useRef(0)

  useEffect(() => {
    // Nothing to reset when the list is short: the hook returns null on that
    // path regardless, and the effect measures afresh if it grows past the
    // threshold again.
    if (!active) return

    const list = ref.current
    if (!list) return

    const container = scrollParent(list)

    const measure = () => {
      frame.current = 0

      const rect = list.getBoundingClientRect()
      const viewTop = container ? container.getBoundingClientRect().top : 0
      const viewHeight = container ? container.clientHeight : window.innerHeight

      // How far the top of the list sits above the top of the viewport.
      const scrolled = viewTop - rect.top

      const first = Math.floor((scrolled - OVERSCAN * rowHeight) / rowHeight)
      const last = Math.ceil((scrolled + viewHeight + OVERSCAN * rowHeight) / rowHeight)

      const start = Math.min(Math.max(first, 0), count)
      const end = Math.min(Math.max(last, start), count)

      setVisible((current) =>
        current && current.start === start && current.end === end
          ? current
          : {
              start,
              end,
              padTop: start * rowHeight,
              padBottom: (count - end) * rowHeight,
            },
      )
    }

    const schedule = () => {
      if (frame.current) return
      frame.current = requestAnimationFrame(measure)
    }

    measure()

    const scroller: HTMLElement | globalThis.Window = container ?? window
    scroller.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)

    const resized = new ResizeObserver(schedule)
    if (container) resized.observe(container)

    return () => {
      scroller.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      resized.disconnect()
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [active, ref, count, rowHeight])

  return active ? visible : null
}

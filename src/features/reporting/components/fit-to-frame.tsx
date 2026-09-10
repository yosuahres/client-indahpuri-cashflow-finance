"use client"

import { useLayoutEffect, useRef, type ReactNode } from "react"

/**
 * Only wide screens get fitted. A phone has nowhere near the height for a year
 * of categories, so squeezing the type to reach it would leave the report
 * unreadable; below this the page scrolls like every other page in the app.
 * Kept in step with the `lg:` variants the report's layout is built on.
 */
const DESKTOP = "(min-width: 1024px)"

/**
 * The sheet fills the page by growing into it, but a financial table set much
 * bigger than this stops reading as one. A report short enough to hit the cap
 * simply leaves some room at the bottom.
 */
const LARGEST = 16

/** Nor under this — below it the figures stop being readable and it scrolls. */
const SMALLEST = 7

/** Halving the range this many times lands within ~0.04px of the best size. */
const STEPS = 8

/**
 * How much air each row may take, above and below, in `em`. Type size is
 * usually pinned by the width of the columns rather than the height of the
 * page, which leaves room at the bottom; this is what spends it, so the rows
 * breathe instead of the sheet stopping short.
 */
const TIGHTEST = 0.4
const LOOSEST = 1.5

/** The range is narrow, so fewer halvings already land under 0.02em. */
const PAD_STEPS = 6

/**
 * Sizes the report's type so the whole sheet fits the page, with no scrolling
 * at any desktop size.
 *
 * Nothing is scaled after the fact here. The sheet is built in `em`, so one
 * font size governs the rows, the gutters and the column widths together; this
 * The table is never stretched or scaled. Two things move, in order: the type
 * is set as large as the page will take, and then — since it is usually the
 * width of the columns that stops the type growing, not the height of the page —
 * the rows are opened up until what is left of the height is used. A short
 * report comes out large and airy, a long one small and tight, and either way
 * it reaches the bottom of the page.
 *
 * The page to fit inside is this component's own element, which the caller
 * gives a fixed height and `overflow-hidden`; nothing inside it may scroll on
 * its own, or the overflow this measures would be swallowed before it is seen.
 * The element carrying `data-fit-text` is what gets the size. Desktop only.
 */
export function FitToFrame({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const frame = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const root = frame.current
    if (!root) return

    const desktop = window.matchMedia(DESKTOP)
    let queued = 0

    const fit = () => {
      queued = 0
      const text = root.querySelector<HTMLElement>("[data-fit-text]")
      if (!text) return

      // Narrow screens keep what the stylesheet gives them.
      if (!desktop.matches) {
        text.style.removeProperty("font-size")
        text.style.removeProperty("--row-pad")
        return
      }
      if (root.clientHeight <= 0) return

      // A pixel of slack: sub-pixel row heights should not count as overflow.
      const fits = () =>
        root.scrollHeight <= root.clientHeight + 1 &&
        root.scrollWidth <= root.clientWidth + 1

      const setSize = (size: number) => {
        text.style.fontSize = `${size}px`
      }
      const setPad = (pad: number) => {
        text.style.setProperty("--row-pad", `${pad}em`)
      }

      /**
       * Fitting is monotonic in either measurement, so the largest value that
       * still fits is a plain bisection: `low` is always known to fit, `high`
       * known not to. Returns the value it settled on, already applied.
       */
      const largestThatFits = (
        low: number,
        high: number,
        passes: number,
        apply: (value: number) => void,
      ) => {
        apply(high)
        if (fits()) return high
        for (let pass = 0; pass < passes; pass += 1) {
          const middle = (low + high) / 2
          apply(middle)
          if (fits()) low = middle
          else high = middle
        }
        apply(low)
        return low
      }

      // Type first, at the tightest rows, so it gets the whole page to grow into.
      setPad(TIGHTEST)
      largestThatFits(SMALLEST, LARGEST, STEPS, setSize)

      // Then spend whatever height is left over on the rows.
      largestThatFits(TIGHTEST, LOOSEST, PAD_STEPS, setPad)
    }

    const schedule = () => {
      if (queued) return
      queued = requestAnimationFrame(fit)
    }

    fit()

    const resized = new ResizeObserver(schedule)
    resized.observe(root)

    // Crossing the breakpoint has to hand the sheet back, or take it over.
    desktop.addEventListener("change", schedule)

    // Stepping to another month swaps the rows without remounting this, so the
    // size has to be found again. Attributes are left out on purpose: fit()
    // writes the size to the table's own style and would otherwise wake itself.
    const changed = new MutationObserver(schedule)
    changed.observe(root, { childList: true, subtree: true, characterData: true })

    // Fonts land after first paint and change every row height.
    document.fonts?.ready.then(schedule).catch(() => {})

    return () => {
      resized.disconnect()
      changed.disconnect()
      desktop.removeEventListener("change", schedule)
      if (queued) cancelAnimationFrame(queued)
    }
  }, [])

  return (
    <div ref={frame} className={className}>
      {children}
    </div>
  )
}

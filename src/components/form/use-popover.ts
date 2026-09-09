"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react"

/** Breathing room kept between the popup and the edge of the viewport. */
const EDGE = 8

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect

/**
 * Pins a popup to its trigger in viewport coordinates.
 *
 * The popup is portalled out of the form, so no ancestor's stacking context or
 * `overflow` can clip it or paint over it — the two ways dropdowns inside
 * scrolling forms normally break.
 */
export function usePopoverPosition(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  preferredHeight = 280,
  /** Width the popup wants. Defaults to matching the trigger. */
  preferredWidth?: number,
) {
  const [style, setStyle] = useState<CSSProperties>({ visibility: "hidden" })

  const update = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    const rect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    // Flip above the trigger only when there is genuinely more room there.
    const flip = spaceBelow < preferredHeight && spaceAbove > spaceBelow

    // A popup wider than its trigger — the calendar in a narrow grid cell —
    // would otherwise hang off the side of a phone screen.
    const width = Math.min(preferredWidth ?? rect.width, window.innerWidth - EDGE * 2)
    const left = Math.min(
      Math.max(rect.left, EDGE),
      window.innerWidth - width - EDGE,
    )

    setStyle({
      position: "fixed",
      left,
      width,
      ...(flip
        ? {
            bottom: window.innerHeight - rect.top + 4,
            maxHeight: Math.max(spaceAbove - 12, 120),
          }
        : {
            top: rect.bottom + 4,
            maxHeight: Math.max(spaceBelow - 12, 120),
          }),
    })
  }, [triggerRef, preferredHeight, preferredWidth])

  useIsomorphicLayoutEffect(() => {
    if (!open) {
      setStyle({ visibility: "hidden" })
      return
    }
    update()

    // `true` captures scrolls on any ancestor, not just the window.
    window.addEventListener("scroll", update, true)
    window.addEventListener("resize", update)
    return () => {
      window.removeEventListener("scroll", update, true)
      window.removeEventListener("resize", update)
    }
  }, [open, update])

  return style
}

/**
 * Where the popup should mount. Inside a modal `<dialog>` it must stay in the
 * dialog, or the browser's top layer would render it behind the backdrop.
 */
export function popoverContainer(trigger: HTMLElement | null): HTMLElement {
  return trigger?.closest("dialog") ?? document.body
}

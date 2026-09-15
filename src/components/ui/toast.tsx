"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { useEffect, useRef, useSyncExternalStore } from "react"
import { CircleCheck, CircleX, X } from "lucide-react"

import { FLASH_COOKIE, type Flash } from "@/lib/flash-cookie"
import type { FormState } from "@/lib/form-state"
import { cn } from "@/lib/cn"

type Toast = Flash & { id: number }

/** How long each kind stays up. An error gets longer — it usually needs reading. */
const DURATION: Record<Flash["kind"], number> = { success: 3000, error: 6000 }

// One store for the whole app, so any component can raise a toast without a
// provider in between.
let toasts: Toast[] = []
let nextId = 1
const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function dismiss(id: number) {
  toasts = toasts.filter((entry) => entry.id !== id)
  emit()
}

function show(kind: Flash["kind"], message: string) {
  const id = nextId++
  // Newest last, and never more than three at once.
  toasts = [...toasts, { id, kind, message }].slice(-3)
  emit()
  setTimeout(() => dismiss(id), DURATION[kind])
}

export const toast = {
  success: (message: string) => show("success", message),
  error: (message: string) => show("error", message),
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const EMPTY: Toast[] = []

/**
 * Raises a toast for each new result of a `useActionState` form: its error, a
 * nudge towards the highlighted fields, or its success message. Saves that
 * redirect never come back here; they flash from the server instead.
 */
export function useActionToast(state: FormState) {
  const initial = useRef(state)
  useEffect(() => {
    if (state === initial.current) return
    if (state.error) toast.error(state.error)
    else if (state.fieldErrors && Object.keys(state.fieldErrors).length > 0) {
      toast.error("Not saved — check the highlighted fields.")
    } else if (state.message) toast.success(state.message)
  }, [state])
}

/** Reads, then clears, a toast a server action left behind before redirecting. */
function takeFlash(): Flash | null {
  const entry = document.cookie.split("; ").find((part) => part.startsWith(`${FLASH_COOKIE}=`))
  if (!entry) return null
  document.cookie = `${FLASH_COOKIE}=; path=/; max-age=0`
  try {
    const flash = JSON.parse(decodeURIComponent(entry.slice(FLASH_COOKIE.length + 1))) as Flash
    return flash.kind === "success" || flash.kind === "error" ? flash : null
  } catch {
    return null
  }
}

/** Mounted once in the root layout. */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => EMPTY)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const layerRef = useRef<HTMLDivElement>(null)

  // A redirect lands on a new URL; that is when a flashed toast can be shown.
  useEffect(() => {
    const flash = takeFlash()
    if (flash) show(flash.kind, flash.message)
  }, [pathname, searchParams])

  // A popover sits in the top layer, so toasts stay visible over an open
  // modal dialog as well as the page.
  useEffect(() => {
    const layer = layerRef.current
    if (!layer?.showPopover) return
    if (items.length > 0) {
      // Re-raise so it lands above anything opened since.
      if (layer.matches(":popover-open")) layer.hidePopover()
      layer.showPopover()
    } else if (layer.matches(":popover-open")) {
      layer.hidePopover()
    }
  }, [items])

  return (
    <div
      ref={layerRef}
      popover="manual"
      aria-live="polite"
      // Layout lives on the inner list: a display class here would override the
      // browser hiding the popover while it is closed.
      className="fixed inset-x-0 top-3 bottom-auto m-0 ml-auto h-fit w-full max-w-sm overflow-visible border-0 bg-transparent p-0 px-3 sm:top-4 sm:right-4 sm:px-0"
    >
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            role={item.kind === "error" ? "alert" : "status"}
            className={cn(
              "flex items-center gap-3 rounded-xl border py-3 pr-2 pl-4 text-sm shadow-lg shadow-black/10",
              item.kind === "success"
                ? "border-emerald-100 bg-emerald-50 text-neutral-800"
                : "border-rose-100 bg-rose-50 text-neutral-800",
            )}
          >
            {item.kind === "success" ? (
              <CircleCheck className="size-5 shrink-0 fill-emerald-500 text-white" strokeWidth={2} />
            ) : (
              <CircleX className="size-5 shrink-0 fill-rose-500 text-white" strokeWidth={2} />
            )}
            <p className="min-w-0 flex-1">{item.message}</p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss"
              className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-neutral-500 hover:bg-black/5 hover:text-neutral-900"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown } from "lucide-react"

import { cn } from "@/lib/cn"
import { popoverContainer, usePopoverPosition } from "./use-popover"

export type SelectOption = { value: string; label: string }

const trigger =
  "flex h-10 w-full items-center gap-2 rounded-md bg-neutral-100 px-3 text-left text-base text-neutral-900 sm:text-sm " +
  "focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800 disabled:opacity-50"

/**
 * Listbox-style dropdown. Replaces `<select>` so the popup can be styled and
 * carry extra actions (see `footer`). The value is submitted through a hidden
 * input, so it still works as a plain form field.
 */
export function Select({
  id,
  name,
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  invalid,
  disabled,
  triggerLabel,
  footer,
}: {
  id: string
  name?: string
  value: string
  onValueChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  /** Fixed trigger text. Use when the control names a menu, not a value. */
  triggerLabel?: string
  /** Rendered under the options — used for "Manage categories". */
  footer?: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const popoverStyle = usePopoverPosition(triggerRef, open)
  // Resolved when opening: reading a ref during render is not safe.
  const [container, setContainer] = useState<HTMLElement | null>(null)

  function openMenu() {
    setContainer(popoverContainer(triggerRef.current))
    setOpen(true)
  }

  const selected = options.find((option) => option.value === value)
  const listId = `${id}-listbox`

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      // The popup lives outside this subtree now, so check it separately.
      if (rootRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  // Open on the current selection so arrow keys continue from there. Adjusted
  // during render rather than in an effect — an effect would paint one frame
  // with the wrong row highlighted.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setActiveIndex(options.findIndex((option) => option.value === value))
  }

  // Moving focus is a DOM concern, so it stays in an effect.
  useEffect(() => {
    if (open) listRef.current?.focus()
  }, [open])

  function commit(index: number) {
    const option = options[index]
    if (!option) return
    onValueChange(option.value)
    setOpen(false)
  }

  function onListKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false)
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      commit(activeIndex)
      return
    }

    const moves: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }
    if (event.key in moves) {
      event.preventDefault()
      setActiveIndex((current) => {
        const next = current + moves[event.key]
        if (next < 0) return options.length - 1
        if (next >= options.length) return 0
        return next
      })
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      setActiveIndex(0)
    }
    if (event.key === "End") {
      event.preventDefault()
      setActiveIndex(options.length - 1)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {name ? <input type="hidden" name={name} value={value} /> : null}

      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-describedby={invalid ? `${id}-error` : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter") {
            event.preventDefault()
            openMenu()
          }
        }}
        className={cn(
          trigger,
          invalid && "outline-2 outline-rose-500",
          !selected && !triggerLabel && "text-neutral-400",
        )}
      >
        <span className={cn("flex-1 truncate", (selected || triggerLabel) && "font-medium")}>
          {triggerLabel ?? selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-neutral-500 transition-transform", open && "rotate-180")}
          strokeWidth={2}
        />
      </button>

      {open && container
        ? createPortal(
            <div
              ref={popupRef}
              style={popoverStyle}
              className="z-[100] flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg"
            >
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-activedescendant={activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
                tabIndex={-1}
                onKeyDown={onListKeyDown}
                className="min-h-0 flex-1 overflow-y-auto py-1 outline-none"
              >
                {options.length === 0 ? (
                  <li className="px-3 py-2.5 text-sm text-neutral-500">No options yet.</li>
                ) : (
                  options.map((option, index) => {
                    const isSelected = option.value === value
                    return (
                      <li
                        key={option.value}
                        id={`${id}-option-${index}`}
                        role="option"
                        aria-selected={isSelected}
                        onPointerEnter={() => setActiveIndex(index)}
                        onClick={() => commit(index)}
                        ref={(node) => {
                          if (index === activeIndex) node?.scrollIntoView({ block: "nearest" })
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-neutral-800",
                          index === activeIndex && "bg-neutral-100",
                        )}
                      >
                        <span className="flex-1 truncate">{option.label}</span>
                        {isSelected ? (
                          <Check className="size-4 shrink-0 text-neutral-900" strokeWidth={2.5} />
                        ) : null}
                      </li>
                    )
                  })
                )}
              </ul>

              {footer ? (
                <div className="shrink-0 border-t border-black/8">{footer(() => setOpen(false))}</div>
              ) : null}
            </div>,
            container,
          )
        : null}

    </div>
  )
}

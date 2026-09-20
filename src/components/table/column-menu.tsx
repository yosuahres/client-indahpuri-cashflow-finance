"use client"

import { useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, Settings2, X } from "lucide-react"

import { popoverContainer, usePopoverPosition } from "@/components/form/use-popover"
import { cn } from "@/lib/cn"

import { reorderColumns, type TableColumn } from "./columns"

const MENU_WIDTH = 264

const iconButton =
  "grid size-8 shrink-0 cursor-pointer place-items-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 disabled:cursor-default disabled:text-neutral-200 disabled:hover:bg-transparent"

const footerButton =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded px-1 text-sm text-neutral-600 transition-colors hover:text-neutral-900 disabled:cursor-default disabled:text-neutral-400 disabled:hover:text-neutral-400 sm:h-8"

/**
 * Picks which of a table's columns show, and in what order. Dragging a row by
 * its handle moves it; the arrows and the arrow keys do the same for anyone
 * not using a mouse — touch never fires a drag at all.
 */
export function ColumnMenu<Key extends string>({
  all,
  defaults,
  columns,
  onChange,
}: {
  /** Every column the table can show, in its natural order. */
  all: readonly TableColumn<Key>[]
  /** What Reset goes back to. */
  defaults: readonly Key[]
  columns: Key[]
  onChange: (columns: Key[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [dragging, setDragging] = useState<number | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const popoverStyle = usePopoverPosition(triggerRef, open, 360, MENU_WIDTH)

  const label = (key: Key) => all.find((column) => column.key === key)?.label ?? key
  const hidden = all.filter((column) => !columns.includes(column.key))
  const isDefault =
    columns.length === defaults.length && columns.every((key, index) => key === defaults[index])

  function close() {
    setOpen(false)
    setAdding(false)
    setDragging(null)
  }

  function move(index: number, to: number) {
    onChange(reorderColumns(columns, index, to))
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            close()
            return
          }
          setContainer(popoverContainer(triggerRef.current))
          setOpen(true)
        }}
        className={cn(
          "inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 sm:h-8",
          open && "bg-neutral-100",
        )}
      >
        <Settings2 className="size-4 shrink-0" strokeWidth={1.75} />
        Columns
      </button>

      {open && container
        ? createPortal(
            <>
              {/* Clicking anywhere else puts the menu away. */}
              <div aria-hidden className="fixed inset-0 z-[90]" onClick={close} />
              <div
                role="dialog"
                aria-label="Table columns"
                style={popoverStyle}
                className="z-[100] flex flex-col overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg"
              >
                <ul className="min-h-0 flex-1 overflow-y-auto py-1">
                  {columns.map((key, index) => (
                    <li
                      key={key}
                      // The row is only the target: a drag has to start on the
                      // handle, so the label and the × stay ordinary controls.
                      onDragOver={(event) => {
                        event.preventDefault()
                        if (dragging === null || dragging === index) return
                        onChange(reorderColumns(columns, dragging, index))
                        setDragging(index)
                      }}
                      className={cn(
                        "flex items-center gap-1 px-2 py-2 text-sm sm:gap-2 sm:py-1.5",
                        dragging === index && "bg-neutral-100",
                      )}
                    >
                      <span
                        draggable
                        tabIndex={0}
                        role="button"
                        aria-label={`Reorder ${label(key)}`}
                        onDragStart={(event) => {
                          setDragging(index)
                          event.dataTransfer.effectAllowed = "move"
                        }}
                        onDragEnd={() => setDragging(null)}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowUp") {
                            event.preventDefault()
                            move(index, index - 1)
                          }
                          if (event.key === "ArrowDown") {
                            event.preventDefault()
                            move(index, index + 1)
                          }
                        }}
                        className="hidden shrink-0 cursor-grab rounded text-neutral-400 hover:text-neutral-600 focus-visible:outline-2 focus-visible:outline-neutral-800 sm:block"
                      >
                        <GripVertical className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="flex shrink-0 items-center sm:hidden">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => move(index, index - 1)}
                          aria-label={`Move ${label(key)} up`}
                          className={iconButton}
                        >
                          <ChevronUp className="size-4" strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          disabled={index === columns.length - 1}
                          onClick={() => move(index, index + 1)}
                          aria-label={`Move ${label(key)} down`}
                          className={iconButton}
                        >
                          <ChevronDown className="size-4" strokeWidth={2} />
                        </button>
                      </span>
                      <span className="min-w-0 flex-1 truncate text-neutral-900">
                        {label(key)}
                      </span>
                      <button
                        type="button"
                        aria-label={`Hide ${label(key)}`}
                        onClick={() => onChange(columns.filter((entry) => entry !== key))}
                        className="grid size-8 shrink-0 cursor-pointer place-items-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 sm:size-6"
                      >
                        <X className="size-3.5" strokeWidth={2} />
                      </button>
                    </li>
                  ))}

                  {columns.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-neutral-500">
                      Only the first column is shown.
                    </li>
                  ) : null}
                </ul>

                {adding && hidden.length > 0 ? (
                  <ul className="border-t border-black/8 py-1">
                    {hidden.map((column) => (
                      <li key={column.key}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange([...columns, column.key])
                            if (hidden.length === 1) setAdding(false)
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm text-neutral-900 transition-colors hover:bg-neutral-50 sm:py-1.5"
                        >
                          <Plus className="size-3.5 shrink-0 text-neutral-400" strokeWidth={2} />
                          {column.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex items-center justify-between gap-2 border-t border-black/8 px-2 py-1.5">
                  <button
                    type="button"
                    disabled={hidden.length === 0}
                    onClick={() => setAdding((value) => !value)}
                    className={footerButton}
                  >
                    {adding ? (
                      <Check className="size-3.5 shrink-0" strokeWidth={2} />
                    ) : (
                      <Plus className="size-3.5 shrink-0" strokeWidth={2} />
                    )}
                    Add Column
                  </button>
                  <button
                    type="button"
                    disabled={isDefault}
                    onClick={() => onChange([...defaults])}
                    className={footerButton}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </>,
            container,
          )
        : null}
    </>
  )
}

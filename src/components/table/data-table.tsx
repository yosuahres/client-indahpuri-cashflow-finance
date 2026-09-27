"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react"
import { createPortal } from "react-dom"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react"

import { popoverContainer } from "@/components/form/use-popover"
import { cn } from "@/lib/cn"

import { HEAD_CELL } from "./styles"
import { DIRECTION_KEY, SORT_KEY } from "./table-toolbar"


/** A column heading with its icon, and a sort toggle when the list can sort by it. */
export function SortHeader({
  label,
  icon: Icon,
  sortKey,
  sort,
  direction,
  className,
}: {
  label: string
  icon?: LucideIcon
  /** The URL value that orders by this column; omit for a column that cannot sort. */
  sortKey?: string
  sort?: string
  direction?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const active = sortKey !== undefined && sort === sortKey
  const Arrow = !active ? ArrowUpDown : direction === "desc" ? ArrowDown : ArrowUp

  function toggle() {
    if (!sortKey) return
    const params = new URLSearchParams(searchParams)
    params.set(SORT_KEY, sortKey)
    params.set(DIRECTION_KEY, active && direction !== "desc" ? "desc" : "asc")
    startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }))
  }

  const content = (
    <>
      {Icon ? <Icon className="size-3.5 shrink-0 text-neutral-500" strokeWidth={1.75} /> : null}
      <span className="flex-1 text-left">{label}</span>
      {sortKey ? (
        <Arrow
          className={cn("size-3.5 shrink-0", active ? "text-neutral-900" : "text-neutral-400")}
          strokeWidth={1.75}
        />
      ) : null}
    </>
  )

  return (
    <th
      scope="col"
      aria-sort={active ? (direction === "desc" ? "descending" : "ascending") : undefined}
      className={cn(HEAD_CELL, sortKey && "p-0", className)}
    >
      {sortKey ? (
        <button
          type="button"
          onClick={toggle}
          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 font-medium hover:bg-neutral-100"
        >
          {content}
        </button>
      ) : (
        <span className="flex items-center gap-2">{content}</span>
      )}
    </th>
  )
}

export const PAGE_SIZES = [10, 25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 50

/** Pages a list that is already all on hand. Back to page one when the rows change. */
export function usePagination<Row>(rows: Row[]) {
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE)
  const [page, setPage] = useState(1)
  const [seenRows, setSeenRows] = useState(rows)
  if (rows !== seenRows) {
    setSeenRows(rows)
    if (page !== 1) setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize

  // The same array until the page moves: a table that folds its own edits in
  // when its rows change must not see a fresh slice on every render.
  const pageRows = useMemo(() => rows.slice(start, start + pageSize), [rows, start, pageSize])

  return {
    rows: pageRows,
    pager: {
      total: rows.length,
      page: current,
      pageCount,
      pageSize,
      onPage: setPage,
      onPageSize: (size: number) => {
        setPageSize(size)
        setPage(1)
      },
    },
  }
}

export const PAGER_BUTTON =
  "grid size-9 place-items-center rounded-lg border border-black/10 text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900 sm:size-7"
const PAGER_DISABLED = "pointer-events-none opacity-40"

/** The frame's foot: where you are in the list, how much a page holds, and the way through. */
export function TablePager({
  total,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
}: ReturnType<typeof usePagination>["pager"]) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1
  const last = Math.min(page * pageSize, total)

  return (
    <nav
      aria-label="Pages"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-black/12 px-3 py-2 text-sm text-neutral-500"
    >
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          {first}–{last} of {total}
        </span>
        <label className="flex items-center gap-2">
          Rows
          <select
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value))}
            className="h-9 cursor-pointer rounded-lg border border-black/10 bg-white px-2 text-sm text-neutral-900 sm:h-7"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          className={cn(PAGER_BUTTON, "cursor-pointer disabled:pointer-events-none disabled:opacity-40")}
        >
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          className={cn(PAGER_BUTTON, "cursor-pointer disabled:pointer-events-none disabled:opacity-40")}
        >
          <ChevronRight className="size-4" strokeWidth={1.75} />
        </button>
      </div>
    </nav>
  )
}

/** A pager arrow for lists paged on the server, where each page is its own URL. */
export function PagerLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string
  disabled: boolean
  label: string
  children: ReactNode
}) {
  if (disabled) {
    return (
      <span aria-disabled aria-label={label} className={cn(PAGER_BUTTON, PAGER_DISABLED)}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} scroll={false} aria-label={label} className={PAGER_BUTTON}>
      {children}
    </Link>
  )
}

export type RowMenuItem =
  | { kind: "heading"; label: string }
  | {
      kind?: "item"
      label: string
      icon?: LucideIcon
      href?: string
      onSelect?: () => void
      /** Ticked, for a choice among several (the role someone holds). */
      checked?: boolean
      danger?: boolean
      disabled?: boolean
      /** Why it is disabled, shown on hover. */
      title?: string
    }

const MENU_WIDTH = 220
const menuRow =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm disabled:cursor-default disabled:opacity-40"

/** The "⋯" at the end of a row, opening what can be done to it. */
export function RowMenu({ label, items }: { label: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  const [style, setStyle] = useState<CSSProperties>({})

  /** Opens under the button, its right edge on the button's, or above it near the bottom. */
  function openMenu() {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    const flip = below < 240 && rect.top > below
    setStyle({
      position: "fixed",
      right: Math.max(window.innerWidth - rect.right, 8),
      ...(flip
        ? { bottom: window.innerHeight - rect.top + 4, maxHeight: rect.top - 12 }
        : { top: rect.bottom + 4, maxHeight: below - 12 }),
    })
    setContainer(popoverContainer(trigger))
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || popupRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      event.stopImmediatePropagation()
      setOpen(false)
      triggerRef.current?.focus()
    }
    // Pinned to the viewport, so it would drift from its row on scroll.
    function onScroll(event: Event) {
      if (popupRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onScroll)
    }
  }, [open])

  const popup = open ? (
    <div
      ref={popupRef}
      role="menu"
      aria-label={label}
      style={{ ...style, width: MENU_WIDTH, maxWidth: "calc(100vw - 16px)" }}
      className="z-50 overflow-y-auto rounded-xl border border-black/10 bg-white p-1 shadow-lg"
    >
      {items.map((item, index) => {
        if (item.kind === "heading") {
          return (
            <p
              key={`heading-${item.label}`}
              className={cn(
                "px-2 pt-2 pb-1 text-xs font-medium text-neutral-500",
                index > 0 && "mt-1 border-t border-black/8",
              )}
            >
              {item.label}
            </p>
          )
        }

        const Icon = item.icon
        const className = cn(
          menuRow,
          item.danger ? "text-rose-600 hover:bg-rose-50" : "text-neutral-800 hover:bg-neutral-100",
        )
        const body = (
          <>
            {Icon ? <Icon className="size-4 shrink-0" strokeWidth={1.75} /> : null}
            <span className="flex-1 truncate">{item.label}</span>
            {item.checked ? <Check className="size-4 shrink-0" strokeWidth={2} /> : null}
          </>
        )

        return item.href && !item.disabled ? (
          <Link
            key={item.label}
            href={item.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className={className}
          >
            {body}
          </Link>
        ) : (
          <button
            key={item.label}
            type="button"
            role={item.checked === undefined ? "menuitem" : "menuitemradio"}
            aria-checked={item.checked}
            disabled={item.disabled}
            title={item.title}
            onClick={() => {
              setOpen(false)
              item.onSelect?.()
            }}
            className={className}
          >
            {body}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className={cn(
          "grid size-9 cursor-pointer place-items-center rounded-md text-neutral-700 hover:bg-neutral-100 sm:size-7",
          open && "bg-neutral-100",
        )}
      >
        <MoreHorizontal className="size-4" strokeWidth={2} />
      </button>
      {popup && container ? createPortal(popup, container) : null}
    </>
  )
}

/** Initials in a grey circle, standing in for a profile picture. */
export function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-neutral-100 text-[10px] font-medium text-neutral-700">
      {initials || "?"}
    </span>
  )
}

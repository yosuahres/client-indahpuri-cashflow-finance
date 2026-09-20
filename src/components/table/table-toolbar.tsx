"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react"
import { SlidersHorizontal, X } from "lucide-react"

import { DatePicker } from "@/components/form/date-picker"
import { CONTROL_SURFACE, Field, TextInput } from "@/components/form/fields"
import { Select, type SelectOption } from "@/components/form/select"
import { cn } from "@/lib/cn"

/**
 * One control in the Filters panel. A field counts towards the button's badge
 * while it differs from `defaultValue` — the empty string on a list that shows
 * everything by default, or the report's own starting period.
 */
type FieldBase = {
  /** The URL key it reads and writes. */
  key: string
  label: string
  value: string
  /** What the field reads as when nothing has been chosen. */
  defaultValue?: string
}

export type ToolbarField =
  | (FieldBase & {
      kind?: "select"
      /** What the empty choice reads as — "All departments". */
      allLabel?: string
      options: SelectOption[]
    })
  | (FieldBase & { kind: "text"; placeholder?: string })
  | (FieldBase & { kind: "date"; today: string })

/** The ordering controls, shown under the filters when a table can sort. */
export type ToolbarSort = {
  value: string
  direction: string
  options: SelectOption[]
  /** The ordering that does not count as a choice on the button's badge. */
  defaultValue: string
}

/** The URL keys the sort controls own. */
export const SORT_KEY = "sort"
export const DIRECTION_KEY = "direction"
/** The URL key the search box owns. */
export const SEARCH_KEY = "q"

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: "asc", label: "Ascending" },
  { value: "desc", label: "Descending" },
]

/** How long typing settles before the URL — and so the rows — follow. */
const SEARCH_DEBOUNCE_MS = 300

/**
 * The row above a table: a search box, a Filters panel that slides in from the
 * side, and room for a Columns menu. Every choice sits in the URL, so the view
 * is shareable and the rows are narrowed on the server.
 */
export function TableToolbar({
  search,
  searchPlaceholder,
  searchLabel = "Search",
  filters,
  sort,
  children,
}: {
  /** The term in the URL, or undefined on a table with nothing to search. */
  search?: string
  searchPlaceholder?: string
  searchLabel?: string
  filters: ToolbarField[]
  sort?: ToolbarSort
  /** Extra toolbar controls, shown after the Filters button. */
  children?: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  // The box keeps its own value so typing stays responsive; the URL catches up.
  const [term, setTerm] = useState(search ?? "")
  const closeRef = useRef<HTMLButtonElement>(null)

  // What is still at its default is not a choice worth counting on the button.
  const applied =
    filters.filter((filter) => filter.value !== (filter.defaultValue ?? "")).length +
    (sort && sort.value !== sort.defaultValue ? 1 : 0) +
    (sort && sort.direction !== "asc" ? 1 : 0)

  function replace(params: URLSearchParams) {
    const query = params.toString()
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    })
  }

  function set(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    replace(params)
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams)
    // Dropping a key is what returns a field to its default, whatever it is.
    for (const filter of filters) params.delete(filter.key)
    params.delete(SORT_KEY)
    params.delete(DIRECTION_KEY)
    replace(params)
  }

  useEffect(() => {
    if (search === undefined) return
    const trimmed = term.trim()
    if (trimmed === search) return
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      if (trimmed) params.set(SEARCH_KEY, trimmed)
      else params.delete(SEARCH_KEY)
      const query = params.toString()
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
      })
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [term, search, pathname, router, searchParams])

  // Escape closes the panel, and opening it moves focus inside.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [open])

  return (
    <>
      <div className={cn("px-4 py-3 sm:px-6 sm:py-4", pending && "opacity-60")}>
        <div className="flex flex-wrap items-center gap-2">
          {search !== undefined ? (
            <div className="w-full min-w-0 sm:w-auto sm:max-w-xs sm:flex-1">
              <label htmlFor="table-search" className="sr-only">
                {searchLabel}
              </label>
              <input
                id="table-search"
                type="search"
                value={term}
                onChange={(event) => setTerm(event.target.value)}
                placeholder={searchPlaceholder}
                className={cn("h-9 sm:h-8", CONTROL_SURFACE)}
              />
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-black/10 px-3 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-800 sm:h-8"
            >
              <SlidersHorizontal className="size-4 shrink-0" strokeWidth={1.75} />
              Filters
              {applied > 0 ? (
                <span className="grid size-5 place-items-center rounded-full bg-neutral-900 text-xs font-medium text-white">
                  {applied}
                </span>
              ) : null}
            </button>

            {children}
          </div>
        </div>
      </div>

      {/* Kept mounted so it can slide, and inert while closed so nothing
          inside it takes focus. */}
      <div className={cn("fixed inset-0 z-40", !open && "pointer-events-none")} inert={!open}>
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-scrim/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal={open}
          aria-labelledby="table-filters-title"
          className={cn(
            "absolute inset-y-0 right-0 flex w-96 max-w-[90vw] flex-col border-l border-black/8 bg-white shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-black/8 px-5 py-4">
            <div>
              <h2
                id="table-filters-title"
                className="text-lg font-semibold tracking-tight text-neutral-900"
              >
                Filters
              </h2>
              <p className="mt-0.5 text-sm text-neutral-500">Choose what you want to see.</p>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close filters"
              className="-mr-1 grid size-8 shrink-0 cursor-pointer place-items-center rounded-md text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              <X className="size-4.5" strokeWidth={1.75} />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
            {filters.map((filter) => {
              const id = `table-filter-${filter.key}`
              return (
                <Field key={filter.key} label={filter.label} htmlFor={id}>
                  {filter.kind === "text" ? (
                    // Committed on blur: a write per keystroke would reload the
                    // rows under the panel while it is still being typed in.
                    <TextInput
                      id={id}
                      defaultValue={filter.value}
                      placeholder={filter.placeholder}
                      onBlur={(event) => {
                        const next = event.target.value.trim()
                        if (next !== filter.value) set(filter.key, next)
                      }}
                    />
                  ) : filter.kind === "date" ? (
                    <DatePicker
                      id={id}
                      name={filter.key}
                      value={filter.value}
                      onValueChange={(value) => set(filter.key, value)}
                      today={filter.today}
                    />
                  ) : (
                    <Select
                      id={id}
                      value={filter.value}
                      onValueChange={(value) => set(filter.key, value)}
                      options={
                        filter.allLabel
                          ? [{ value: "", label: filter.allLabel }, ...filter.options]
                          : filter.options
                      }
                    />
                  )}
                </Field>
              )
            })}

            {sort ? (
              <div className={cn(filters.length > 0 && "border-t border-black/8 pt-5")}>
                <h3 className="text-sm font-medium text-neutral-900">Sort</h3>
                <p className="mt-0.5 text-sm text-neutral-500">Order the rows by any column.</p>

                <div className="mt-3 space-y-5">
                  <Field label="Sort by" htmlFor="table-sort">
                    <Select
                      id="table-sort"
                      value={sort.value}
                      onValueChange={(value) => set(SORT_KEY, value)}
                      options={sort.options}
                    />
                  </Field>

                  <Field label="Order" htmlFor="table-direction">
                    <Select
                      id="table-direction"
                      value={sort.direction}
                      onValueChange={(value) => set(DIRECTION_KEY, value)}
                      options={DIRECTION_OPTIONS}
                    />
                  </Field>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-black/8 px-5 py-4">
            <button
              type="button"
              onClick={clearAll}
              disabled={applied === 0}
              className="inline-flex h-9 cursor-pointer items-center rounded-md px-1 text-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 disabled:cursor-default disabled:opacity-40 disabled:hover:text-neutral-600"
            >
              Clear all
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition-opacity hover:opacity-85"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

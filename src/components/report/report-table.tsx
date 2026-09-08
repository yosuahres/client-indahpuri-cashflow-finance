"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/format"
import type { ReportRow } from "./types"

/** Sticky columns need an opaque background of their own or rows show through. */
const stickyGutter = "sticky left-0 z-10 w-12 min-w-12"
const stickySection = "sticky left-12 z-10 min-w-[300px]"

function Amount({ value }: { value: number }) {
  return (
    <span className={cn("tabular-nums", value < 0 && "text-rose-600")}>
      {formatCurrency(value)}
    </span>
  )
}

export function ReportTable({
  periods,
  rows,
  caption,
}: {
  periods: string[]
  rows: ReportRow[]
  /** Screen-reader description of what the table holds. */
  caption: string
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState("")

  function toggle(sectionId: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(sectionId)) next.delete(sectionId)
      else next.add(sectionId)
      return next
    })
  }

  const visibleRows = useMemo(() => {
    const term = query.trim().toLowerCase()

    return rows.filter((row) => {
      if (term) {
        // While filtering, spacers are noise and collapse state is ignored.
        return row.variant !== "spacer" && row.label.toLowerCase().includes(term)
      }
      if (row.variant === "item" && row.sectionId) {
        return !collapsed.has(row.sectionId)
      }
      return true
    })
  }, [rows, collapsed, query])

  const columnCount = periods.length + (periods.length > 1 ? 1 : 0)

  return (
    <div className="overflow-x-auto border-t border-black/8">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-neutral-50 text-left">
            <th scope="col" className={cn(stickyGutter, "bg-neutral-50 p-0")}>
              <span className="sr-only">Row</span>
            </th>
            <th
              scope="col"
              className={cn(
                stickySection,
                "bg-neutral-50 px-3 py-2.5 font-medium text-neutral-700",
              )}
            >
              Section
            </th>
            {periods.map((period) => (
              <th
                key={period}
                scope="col"
                className="min-w-[160px] px-3 py-2.5 text-right font-medium text-neutral-700"
              >
                {period}
              </th>
            ))}
            {periods.length > 1 ? (
              <th
                scope="col"
                className="min-w-[160px] px-3 py-2.5 text-right font-medium text-neutral-700"
              >
                Total
              </th>
            ) : null}
          </tr>

          <tr className="bg-neutral-50">
            <td className={cn(stickyGutter, "bg-neutral-50")} />
            <td className={cn(stickySection, "bg-neutral-50 px-3 pb-2.5")}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter sections…"
                aria-label="Filter sections"
                className="h-7 w-full rounded-md bg-neutral-200/60 px-2.5 text-xs text-neutral-900 placeholder:text-neutral-500 focus:outline-2 focus:outline-neutral-800"
              />
            </td>
            <td colSpan={columnCount} className="bg-neutral-50" />
          </tr>
        </thead>

        <tbody>
          {visibleRows.map((row, index) => {
            if (row.variant === "spacer") {
              return (
                <tr key={row.id} className="h-8">
                  <td className={cn(stickyGutter, "bg-white px-3 text-xs text-neutral-300")}>
                    {index + 1}
                  </td>
                  <td className={cn(stickySection, "bg-white")} />
                  <td colSpan={columnCount} />
                </tr>
              )
            }

            const isSection = row.variant === "section"
            const isStrong = row.variant !== "item"
            const open = row.sectionId ? !collapsed.has(row.sectionId) : true
            const Chevron = open ? ChevronDown : ChevronRight
            const total = row.values.reduce((sum, value) => sum + value, 0)

            return (
              <tr
                key={row.id}
                className={cn(
                  "border-t border-black/5 hover:bg-neutral-50/70",
                  row.variant === "grand" && "border-t-black/15",
                )}
              >
                <td
                  className={cn(
                    stickyGutter,
                    "bg-white px-3 py-2.5 text-xs text-neutral-400",
                  )}
                >
                  {index + 1}
                </td>
                <td
                  className={cn(
                    stickySection,
                    "bg-white px-3 py-2.5",
                    isStrong ? "font-semibold text-neutral-900" : "text-neutral-700",
                  )}
                >
                  {isSection && row.sectionId ? (
                    <button
                      type="button"
                      onClick={() => toggle(row.sectionId!)}
                      aria-expanded={open}
                      className="-ml-1 flex items-center gap-1 rounded text-left hover:opacity-70"
                    >
                      <Chevron className="size-4 shrink-0 text-neutral-500" strokeWidth={2} />
                      {row.label}
                    </button>
                  ) : (
                    <span className={cn(row.variant === "item" && "pl-5")}>
                      {row.label}
                    </span>
                  )}
                </td>

                {row.values.map((value, periodIndex) => (
                  <td
                    key={periods[periodIndex]}
                    className={cn(
                      "px-3 py-2.5 text-right",
                      isStrong ? "font-semibold text-neutral-900" : "text-neutral-700",
                    )}
                  >
                    <Amount value={value} />
                  </td>
                ))}

                {periods.length > 1 ? (
                  <td
                    className={cn(
                      "px-3 py-2.5 text-right",
                      isStrong ? "font-semibold text-neutral-900" : "text-neutral-700",
                    )}
                  >
                    <Amount value={total} />
                  </td>
                ) : null}
              </tr>
            )
          })}

          {visibleRows.length === 0 ? (
            <tr>
              <td
                colSpan={columnCount + 2}
                className="px-3 py-10 text-center text-sm text-neutral-500"
              >
                No sections match “{query}”.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

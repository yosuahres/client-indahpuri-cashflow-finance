"use client"

import { useMemo } from "react"

import { cn } from "@/lib/cn"
import { formatCurrency, formatDate } from "@/lib/format"
import type { TransactionDetail } from "./types"

/** Sticky columns need an opaque background of their own or rows show through. */
const stickyGutter = "sticky left-0 z-10 w-9 min-w-9 sm:w-12 sm:min-w-12"
const stickyDate = "sticky left-9 z-10 min-w-[112px] sm:left-12 sm:min-w-[120px]"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const amountCell = "min-w-[140px] px-2 py-2.5 text-right sm:min-w-[160px] sm:px-3"

export function TransactionTable({
  transactions,
  caption,
}: {
  transactions: TransactionDetail[]
  /** Screen-reader description of what the table holds. */
  caption: string
}) {
  const net = useMemo(
    () =>
      transactions.reduce(
        (total, entry) =>
          entry.kind === "income" ? total + entry.amount : total - entry.amount,
        0,
      ),
    [transactions],
  )

  return (
    <div className="overflow-x-auto border-t border-black/8">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-neutral-50">
            <th scope="col" className={cn(stickyGutter, "bg-neutral-50 p-0")}>
              <span className="sr-only">Row</span>
            </th>
            <th scope="col" className={cn(stickyDate, "bg-neutral-50", headCell)}>
              Date
            </th>
            <th scope="col" className={cn("min-w-[200px]", headCell)}>
              Category
            </th>
            <th scope="col" className={cn("min-w-[180px]", headCell)}>
              Account
            </th>
            <th scope="col" className={cn("min-w-[120px]", headCell)}>
              Type
            </th>
            <th scope="col" className={cn(amountCell, "font-medium text-neutral-700")}>
              Amount
            </th>
          </tr>
        </thead>

        <tbody>
          {transactions.map((entry, index) => (
            <tr key={entry.id} className="border-t border-black/5 hover:bg-neutral-50/70">
              <td className={cn(stickyGutter, "bg-white px-3 py-2.5 text-xs text-neutral-400")}>
                {index + 1}
              </td>
              <td className={cn(stickyDate, "bg-white px-3 py-2.5 whitespace-nowrap text-neutral-700")}>
                {formatDate(entry.occurredOn)}
              </td>
              <td className="px-3 py-2.5 text-neutral-900">{entry.category}</td>
              <td className="px-3 py-2.5 text-neutral-700">{entry.account}</td>
              <td className="px-3 py-2.5 capitalize text-neutral-700">{entry.kind}</td>
              <td
                className={cn(
                  amountCell,
                  "tabular-nums",
                  entry.kind === "expense" ? "text-rose-600" : "text-neutral-900",
                )}
              >
                {formatCurrency(entry.amount)}
              </td>
            </tr>
          ))}

          {transactions.length === 0 ? (
            <tr className="border-t border-black/5">
              <td className={cn(stickyGutter, "bg-white")} />
              <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                No transactions recorded in this range.
              </td>
            </tr>
          ) : null}
        </tbody>

        {transactions.length > 0 ? (
          <tfoot>
            <tr className="border-t border-black/15 bg-neutral-50 font-semibold text-neutral-900">
              <td className={cn(stickyGutter, "bg-neutral-50")} />
              <td className={cn(stickyDate, "bg-neutral-50 px-3 py-2.5")}>Total</td>
              <td colSpan={2} className="px-3 py-2.5 font-normal text-neutral-500">
                {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
              </td>
              {/* The direction column names what the figure beside it is. */}
              <td className="px-3 py-2.5">Net</td>
              <td
                className={cn(
                  amountCell,
                  "tabular-nums",
                  net < 0 ? "text-rose-600" : "text-neutral-900",
                )}
              >
                {formatCurrency(net)}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

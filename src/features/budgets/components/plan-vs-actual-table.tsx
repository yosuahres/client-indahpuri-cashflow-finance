import { accountDetail } from "@/features/accounts/constants"
import type { Account } from "@/features/accounts/actions"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/format"

import type { PlanVsActualRow } from "../plan-vs-actual"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const figureHead = "min-w-[130px] px-2 py-2.5 text-right font-medium text-neutral-700 sm:px-3"
const cell = "px-2 py-2.5 sm:px-3"
const figure = "min-w-[130px] px-2 py-2.5 text-right tabular-nums sm:px-3"

/** Zero reads as "nothing planned" here, so it shows as a dash, not a 0. */
function Amount({ value, className }: { value: number; className?: string }) {
  if (Math.round(value) === 0) return <span className="text-neutral-300">&ndash;</span>
  return <span className={className}>{formatCurrency(value)}</span>
}

/**
 * Each account's plan against what actually moved through it.
 *
 * Spending over plan is the one thing this table exists to surface, so an
 * actual expense past its budget is red — there is no separate variance
 * column, which would be a fifth figure to read for something a colour says.
 */
export function PlanVsActualTable({
  rows,
  totals,
  accounts,
}: {
  rows: PlanVsActualRow[]
  totals: Omit<PlanVsActualRow, "account">
  /** Resolves an account name to what that account actually is. */
  accounts: Account[]
}) {
  const details = new Map(accounts.map((entry) => [entry.name, accountDetail(entry)]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">
          Planned and actual income and expense for each account over the chosen range.
        </caption>
        <thead>
          <tr className="bg-neutral-50">
            <th scope="col" className={cn("min-w-[180px]", headCell)}>
              Account
            </th>
            <th scope="col" className={figureHead}>
              Planned Income
            </th>
            <th scope="col" className={figureHead}>
              Actual Income
            </th>
            <th scope="col" className={figureHead}>
              Planned Expense
            </th>
            <th scope="col" className={figureHead}>
              Actual Expense
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const detail = row.account ? details.get(row.account) : null
            // Only an expense that had a plan can be said to have passed it.
            const over = row.plannedExpense > 0 && row.actualExpense > row.plannedExpense

            return (
              <tr key={row.account ?? ""} className="border-t border-black/5">
                <td className={cell}>
                  <span className={row.account ? "text-neutral-900" : "text-neutral-500"}>
                    {row.account ?? "All accounts"}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-xs",
                      row.account && !detail ? "text-amber-600" : "text-neutral-500",
                    )}
                  >
                    {row.account
                      ? (detail ?? "No longer in your accounts")
                      : "Plans entered before accounts"}
                  </span>
                </td>
                <td className={cn(figure, "text-neutral-500")}>
                  <Amount value={row.plannedIncome} />
                </td>
                <td className={figure}>
                  <Amount value={row.actualIncome} className="text-neutral-900" />
                </td>
                <td className={cn(figure, "text-neutral-500")}>
                  <Amount value={row.plannedExpense} />
                </td>
                <td className={figure}>
                  <Amount
                    value={row.actualExpense}
                    className={over ? "font-semibold text-rose-600" : "text-neutral-900"}
                  />
                </td>
              </tr>
            )
          })}

          {rows.length === 0 ? (
            <tr className="border-t border-black/5">
              <td colSpan={5} className="px-3 py-8 text-center text-neutral-500">
                No budgets or transactions in this range.
              </td>
            </tr>
          ) : null}
        </tbody>

        {rows.length > 0 ? (
          <tfoot>
            <tr className="border-t border-black/15 bg-neutral-50 font-semibold text-neutral-900">
              <td className={cell}>Total</td>
              <td className={cn(figure, "font-normal text-neutral-500")}>
                <Amount value={totals.plannedIncome} />
              </td>
              <td className={figure}>
                <Amount value={totals.actualIncome} />
              </td>
              <td className={cn(figure, "font-normal text-neutral-500")}>
                <Amount value={totals.plannedExpense} />
              </td>
              <td className={figure}>
                <Amount
                  value={totals.actualExpense}
                  className={
                    totals.plannedExpense > 0 && totals.actualExpense > totals.plannedExpense
                      ? "text-rose-600"
                      : undefined
                  }
                />
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  )
}

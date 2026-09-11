import { longMonthName } from "@/features/reporting/months"
import { cn } from "@/lib/cn"
import { kindLabel, SECTIONS, type TransactionKind } from "@/lib/finance"
import { formatCurrency } from "@/lib/format"
import type { BudgetEntry } from "../list"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-2 py-2.5 sm:px-3"
const amountCell = "min-w-[140px] px-2 py-2.5 text-right sm:min-w-[160px] sm:px-3"

const sectionLabel = (value: string) =>
  SECTIONS.find((section) => section.value === value)?.label ?? value

const sum = (entries: BudgetEntry[]) =>
  entries.reduce((total, entry) => total + entry.amount, 0)

/**
 * The plans of one direction. Income and expense are never mixed in a column
 * of figures here — they are opposite signs of the same total, and a table
 * that adds them up reads as if they cancelled.
 */
function KindTable({
  kind,
  entries,
  caption,
  emptyLabel,
  showPeriod,
  showPerMonth,
}: {
  kind: TransactionKind
  entries: BudgetEntry[]
  caption: string
  emptyLabel: string
  showPeriod: boolean
  showPerMonth: boolean
}) {
  // Budget, Section, Category, Amount, plus whichever extras are asked for.
  const columns = 4 + (showPeriod ? 1 : 0) + (showPerMonth ? 1 : 0)
  const total = sum(entries)
  const income = kind === "income"

  return (
    <section className="border-t border-black/8">
      <div className="flex items-baseline justify-between gap-3 px-3 py-2.5 sm:px-4">
        <h4
          className={cn(
            "text-sm font-semibold",
            income ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {kindLabel(kind)}
        </h4>
        <span
          className={cn(
            "text-sm font-semibold tabular-nums",
            income ? "text-neutral-900" : "text-rose-600",
          )}
        >
          {formatCurrency(total)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-neutral-50">
              {showPeriod ? (
                <th scope="col" className={cn("min-w-[120px]", headCell)}>
                  Period
                </th>
              ) : null}
              <th scope="col" className={cn("min-w-[180px]", headCell)}>
                Budget
              </th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>
                Section
              </th>
              <th scope="col" className={cn("min-w-[180px]", headCell)}>
                Category
              </th>
              {showPerMonth ? (
                <th scope="col" className={cn(amountCell, "font-medium text-neutral-700")}>
                  Per Month
                </th>
              ) : null}
              <th scope="col" className={cn(amountCell, "font-medium text-neutral-700")}>
                Amount
              </th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-t border-black/5">
                {showPeriod ? (
                  <td className={cn(cell, "whitespace-nowrap text-neutral-700")}>
                    {entry.month === null ? (
                      <span className="text-neutral-500">Whole year</span>
                    ) : (
                      longMonthName(entry.month)
                    )}
                  </td>
                ) : null}
                {/* The cost center is what tells two same-named plans apart, so
                    it rides along in the muted half of the name cell. */}
                <td className={cn(cell, "text-neutral-900")}>
                  {entry.name}
                  {entry.costCenter ? (
                    <span className="text-neutral-500"> · {entry.costCenter}</span>
                  ) : null}
                </td>
                <td className={cn(cell, "text-neutral-700")}>{sectionLabel(entry.section)}</td>
                {/* A plan with no category covers its whole section. */}
                <td
                  className={cn(
                    cell,
                    entry.category?.trim() ? "text-neutral-900" : "text-neutral-500",
                  )}
                >
                  {entry.category?.trim() || "Whole section"}
                </td>
                {showPerMonth ? (
                  <td className={cn(amountCell, "tabular-nums text-neutral-500")}>
                    {formatCurrency(entry.amount / 12)}
                  </td>
                ) : null}
                <td
                  className={cn(
                    amountCell,
                    "tabular-nums",
                    income ? "text-neutral-900" : "text-rose-600",
                  )}
                >
                  {formatCurrency(entry.amount)}
                </td>
              </tr>
            ))}

            {entries.length === 0 ? (
              <tr className="border-t border-black/5">
                <td colSpan={columns} className="px-3 py-6 text-center text-neutral-500">
                  {emptyLabel}
                </td>
              </tr>
            ) : null}
          </tbody>

          {entries.length > 0 ? (
            <tfoot>
              <tr className="border-t border-black/15 bg-neutral-50 font-semibold text-neutral-900">
                <td className={cell}>Total</td>
                <td
                  colSpan={columns - (showPerMonth ? 3 : 2)}
                  className={cn(cell, "font-normal text-neutral-500")}
                >
                  {entries.length} budget{entries.length === 1 ? "" : "s"}
                </td>
                {showPerMonth ? (
                  <td className={cn(amountCell, "tabular-nums font-normal text-neutral-500")}>
                    {formatCurrency(total / 12)}
                  </td>
                ) : null}
                <td
                  className={cn(
                    amountCell,
                    "tabular-nums",
                    income ? "text-neutral-900" : "text-rose-600",
                  )}
                >
                  {formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  )
}

/**
 * One period's plans, split by direction. The figures are plans, not actuals —
 * what was spent against them is the Laporan Keuangan's business, and this
 * sheet deliberately does not repeat it.
 */
export function BudgetSheet({
  entries,
  label,
  showPeriod = false,
  showPerMonth = false,
}: {
  entries: BudgetEntry[]
  /** The period these belong to, for the captions and the empty rows. */
  label: string
  /** On a yearly view, where rows come from different months. */
  showPeriod?: boolean
  /** The twelfth of a yearly plan that lands in each month. */
  showPerMonth?: boolean
}) {
  return (
    <>
      {(["income", "expense"] as const).map((kind) => (
        <KindTable
          key={kind}
          kind={kind}
          entries={entries.filter((entry) => entry.kind === kind)}
          caption={`${kindLabel(kind)} budgets for ${label}`}
          emptyLabel={`No ${kind} budgets for ${label} yet.`}
          showPeriod={showPeriod}
          showPerMonth={showPerMonth}
        />
      ))}
    </>
  )
}

"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"

import type { Account } from "@/features/accounts/actions"
import { accountDetail } from "@/features/accounts/constants"
import { longMonthName } from "@/features/reporting/months"
import { cn } from "@/lib/cn"
import { kindLabel, SECTIONS, type TransactionKind } from "@/lib/finance"
import { formatCurrency } from "@/lib/format"

import { deleteBudget, setBudgetAmount } from "../actions"
import type { BudgetEntry } from "../list"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-2 py-2.5 sm:px-3"
const amountCell = "min-w-[150px] px-2 py-2.5 text-right sm:min-w-[170px] sm:px-3"

const money = new Intl.NumberFormat("id-ID")

const sectionLabel = (value: string) =>
  SECTIONS.find((section) => section.value === value)?.label ?? value

/**
 * A plan's figure, editable where it stands. Opening a form to change one
 * number was the whole friction, so this is a click and a retype.
 *
 * Zero is not accepted: the amount has a positive check constraint behind it,
 * and removing a plan is what the delete button is for. An emptied or zeroed
 * field springs back to what was there.
 */
function AmountInput({
  value,
  onCommit,
  expense,
  label,
}: {
  value: number
  onCommit: (amount: number) => void
  expense: boolean
  label: string
}) {
  const [draft, setDraft] = useState(String(Math.round(value)))
  const [editing, setEditing] = useState(false)

  // A save elsewhere, or this one landing, replaces the figure underneath.
  // Adjusted during render rather than in an effect, so the new value paints
  // in the same pass — but never while it is being typed over.
  const [seen, setSeen] = useState(value)
  if (value !== seen && !editing) {
    setSeen(value)
    setDraft(String(Math.round(value)))
  }

  function revert() {
    setDraft(String(Math.round(value)))
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      value={draft === "" ? "" : money.format(Number(draft))}
      onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
      onFocus={() => setEditing(true)}
      onBlur={() => {
        setEditing(false)
        const next = Number(draft)
        if (!Number.isFinite(next) || next <= 0) return revert()
        if (next !== Math.round(value)) onCommit(next)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === "Escape") {
          revert()
          setEditing(false)
          event.currentTarget.blur()
        }
      }}
      className={cn(
        "w-full rounded-md bg-transparent px-2 py-1 text-right text-sm tabular-nums",
        "hover:bg-neutral-100 focus:bg-white",
        "focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800",
        expense ? "text-rose-600" : "text-neutral-900",
      )}
    />
  )
}

/** Two clicks to remove a plan — nothing recovers one once it is gone. */
function DeleteCell({
  entry,
  confirming,
  onConfirm,
  onDelete,
  disabled,
}: {
  entry: BudgetEntry
  confirming: boolean
  onConfirm: (confirming: boolean) => void
  onDelete: () => void
  disabled: boolean
}) {
  const what = `${entry.category?.trim() || entry.name}, ${formatCurrency(entry.amount)}`

  return (
    <td className="w-24 px-2 py-1.5 text-right">
      {confirming ? (
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={disabled}
            className="rounded bg-rose-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          >
            Delete
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onConfirm(true)}
          disabled={disabled}
          aria-label={`Remove ${what}`}
          className={cn(
            "grid size-8 place-items-center rounded-md text-neutral-300",
            "hover:bg-neutral-100 hover:text-rose-600",
            "focus-visible:text-rose-600 focus-visible:outline-2 focus-visible:outline-neutral-800",
            "disabled:pointer-events-none disabled:opacity-40",
          )}
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </button>
      )}
    </td>
  )
}

/**
 * An account as a plan names it: the name it was filed under, and underneath,
 * what that account is — a bank and which bank, a tin and who holds it.
 *
 * Budgets store the account by name so a rename never rewrites them, which
 * means a plan can outlive the account it points at. That is worth saying: the
 * plan still counts in the report, but nothing can be filtered to it.
 */
function AccountCell({
  account,
  detailOf,
}: {
  account: string | null
  detailOf: (name: string) => string | null
}) {
  if (!account) {
    return (
      <td className={cn(cell, "text-neutral-500")}>
        All accounts
        <span className="mt-0.5 block text-xs text-neutral-400">Entered before accounts</span>
      </td>
    )
  }

  const detail = detailOf(account)

  return (
    <td className={cell}>
      <span className="text-neutral-900">{account}</span>
      <span
        className={cn("mt-0.5 block text-xs", detail ? "text-neutral-500" : "text-amber-600")}
      >
        {detail ?? "No longer in your accounts"}
      </span>
    </td>
  )
}

/**
 * One direction's plans: a banner, its rows, and its own subtotal.
 *
 * Income and expense share the table but never share a total — they are
 * opposite signs of the same figure, and a column that added them would read
 * as if they cancelled.
 */
function KindBlock({
  kind,
  entries,
  emptyLabel,
  dataColumns,
  columns,
  showPeriod,
  showPerMonth,
  showAccount,
  amountOf,
  detailOf,
  onAmount,
  onDelete,
  confirmingId,
  onConfirm,
  pending,
}: {
  kind: TransactionKind
  entries: BudgetEntry[]
  emptyLabel: string
  dataColumns: number
  columns: number
  showPeriod: boolean
  showPerMonth: boolean
  showAccount: boolean
  amountOf: (entry: BudgetEntry) => number
  detailOf: (name: string) => string | null
  onAmount: (id: string, amount: number) => void
  onDelete: (id: string) => void
  confirmingId: string | null
  onConfirm: (id: string | null) => void
  pending: boolean
}) {
  const income = kind === "income"
  const total = entries.reduce((sum, entry) => sum + amountOf(entry), 0)

  return (
    <tbody className="border-t border-black/8">
      <tr className={income ? "bg-emerald-50/60" : "bg-rose-50/50"}>
        <td
          colSpan={columns}
          className={cn(
            "px-2 py-2 text-sm font-semibold sm:px-3",
            income ? "text-emerald-700" : "text-rose-700",
          )}
        >
          {kindLabel(kind)}
        </td>
      </tr>

      {entries.map((entry) => {
        const amount = amountOf(entry)
        return (
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
            {/* A plan from before accounts were named counts on all of them. */}
            {showAccount ? <AccountCell account={entry.account} detailOf={detailOf} /> : null}
            <td className={cn(cell, "text-neutral-700")}>{sectionLabel(entry.section)}</td>
            {/* A plan with no category covers its whole section. */}
            <td className={cell}>
              <span className={entry.category?.trim() ? "text-neutral-900" : "text-neutral-500"}>
                {entry.category?.trim() || "Whole section"}
              </span>
              {/* What tells two otherwise identical plans apart. */}
              {entry.costCenter ? (
                <span className="mt-0.5 block text-xs text-neutral-500">{entry.costCenter}</span>
              ) : null}
            </td>
            {showPerMonth ? (
              <td className={cn(amountCell, "tabular-nums text-neutral-500")}>
                {formatCurrency(amount / 12)}
              </td>
            ) : null}
            <td className="min-w-[150px] px-1 py-1.5 sm:min-w-[170px] sm:px-2">
              <AmountInput
                value={amount}
                expense={!income}
                onCommit={(next) => onAmount(entry.id, next)}
                label={`Budget amount for ${entry.category?.trim() || entry.name}${
                  entry.month === null ? "" : `, ${longMonthName(entry.month)}`
                }`}
              />
            </td>
            <DeleteCell
              entry={entry}
              confirming={confirmingId === entry.id}
              onConfirm={(next) => onConfirm(next ? entry.id : null)}
              onDelete={() => onDelete(entry.id)}
              disabled={pending}
            />
          </tr>
        )
      })}

      {entries.length === 0 ? (
        <tr className="border-t border-black/5">
          <td colSpan={columns} className="px-3 py-6 text-center text-neutral-500">
            {emptyLabel}
          </td>
        </tr>
      ) : null}

      {entries.length > 0 ? (
        <tr className="border-t border-black/10 bg-neutral-50 font-semibold text-neutral-900">
          <td className={cell}>Total {kindLabel(kind)}</td>
          <td
            colSpan={dataColumns - 2 - (showPerMonth ? 1 : 0)}
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
          <td />
        </tr>
      ) : null}
    </tbody>
  )
}

/**
 * One period's plans, split by direction and editable in place. The figures
 * are plans, not actuals — what was spent against them is the Laporan
 * Keuangan's business, and this sheet deliberately does not repeat it.
 *
 * Income and expense share one table rather than having one each. Two tables
 * meant two horizontal scrollbars stacked in the same card, scrolling
 * independently, so identical columns drifted out of line with each other.
 */
export function BudgetSheet({
  entries,
  accounts,
  label,
  showPeriod = false,
  showPerMonth = false,
  showAccount = true,
}: {
  entries: BudgetEntry[]
  /** Resolves each plan's account name to what that account actually is. */
  accounts: Account[]
  /** The period these belong to, for the caption and the empty rows. */
  label: string
  /** On a yearly view, where rows come from different months. */
  showPeriod?: boolean
  /** The twelfth of a yearly plan that lands in each month. */
  showPerMonth?: boolean
  /** Off once the list is already narrowed to one account. */
  showAccount?: boolean
}) {
  const [error, setError] = useState<string | null>(null)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // An edit paints before the server answers. Rows arrive fresh from the
  // server after `refresh()`, so a new array is the signal that the overrides
  // have been folded in and can go.
  const [amounts, setAmounts] = useState<ReadonlyMap<string, number>>(new Map())
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())
  const [seenRows, setSeenRows] = useState(entries)
  if (entries !== seenRows) {
    setSeenRows(entries)
    if (amounts.size > 0) setAmounts(new Map())
    if (removed.size > 0) setRemoved(new Set())
  }

  const amountOf = (entry: BudgetEntry) => amounts.get(entry.id) ?? entry.amount
  const live = entries.filter((entry) => !removed.has(entry.id))

  const details = new Map(accounts.map((entry) => [entry.name, accountDetail(entry)]))
  const detailOf = (name: string) => details.get(name) ?? null

  function commitAmount(id: string, amount: number) {
    setError(null)
    setAmounts((current) => new Map(current).set(id, amount))
    startTransition(async () => {
      const result = await setBudgetAmount(id, amount)
      if (!result.ok) {
        setError(result.error ?? "Could not change that amount.")
        // Put the figure back; the server never took the change.
        setAmounts((current) => {
          const next = new Map(current)
          next.delete(id)
          return next
        })
      }
    })
  }

  function remove(id: string) {
    setError(null)
    setConfirmingId(null)
    setRemoved((current) => new Set(current).add(id))
    startTransition(async () => {
      const result = await deleteBudget(id)
      if (!result.ok) {
        setError(result.error ?? "Could not remove that budget.")
        setRemoved((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
      }
    })
  }

  // Section, Category, Amount, whichever extras are asked for, and the actions.
  const dataColumns = 3 + (showPeriod ? 1 : 0) + (showAccount ? 1 : 0) + (showPerMonth ? 1 : 0)
  const columns = dataColumns + 1

  return (
    <>
      {error ? (
        <p
          role="alert"
          className="border-t border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800"
        >
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            Budgets for {label}, income and expense, each figure editable.
          </caption>
          <thead>
            <tr className="bg-neutral-50">
              {showPeriod ? (
                <th scope="col" className={cn("min-w-[120px]", headCell)}>
                  Period
                </th>
              ) : null}
              {showAccount ? (
                <th scope="col" className={cn("min-w-[160px]", headCell)}>
                  Account
                </th>
              ) : null}
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
              <th scope="col" className="w-24 px-2 py-2.5">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>

          {(["income", "expense"] as const).map((kind) => (
            <KindBlock
              key={kind}
              kind={kind}
              entries={live.filter((entry) => entry.kind === kind)}
              emptyLabel={`No ${kind} budgets for ${label} yet.`}
              dataColumns={dataColumns}
              columns={columns}
              showPeriod={showPeriod}
              showPerMonth={showPerMonth}
              showAccount={showAccount}
              amountOf={amountOf}
              detailOf={detailOf}
              onAmount={commitAmount}
              onDelete={remove}
              confirmingId={confirmingId}
              onConfirm={setConfirmingId}
              pending={pending}
            />
          ))}
        </table>
      </div>
    </>
  )
}

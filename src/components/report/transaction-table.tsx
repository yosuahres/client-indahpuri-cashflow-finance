"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react"
import { createPortal } from "react-dom"
import { Check, ChevronDown, Trash2, X } from "lucide-react"

import type { Account } from "@/features/accounts/actions"
import type { Category } from "@/features/categories/actions"
import { popoverContainer, usePopoverPosition } from "@/components/form/use-popover"
import { deleteTransactions, setTransactionPaid } from "@/features/transactions/actions"
import { TransactionPanel } from "@/features/transactions/components/transaction-panel"
import { useWindowedRows } from "@/hooks/use-windowed-rows"
import { cn } from "@/lib/cn"
import { INCOME_PAYMENT_STATUSES, PAYMENT_STATUSES } from "@/lib/finance"
import { formatCurrency, formatDate } from "@/lib/format"
import type { TransactionDetail } from "./types"

/** Sticky columns need an opaque background of their own or rows show through. */
const stickyGutter = "sticky left-0 z-10 w-9 min-w-9 sm:w-12 sm:min-w-12"
const stickyDate = "sticky left-9 z-10 min-w-[112px] sm:left-12 sm:min-w-[120px]"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const amountCell = "min-w-[140px] px-2 py-2.5 text-right sm:min-w-[160px] sm:px-3"

const checkbox =
  "size-4 shrink-0 cursor-pointer accent-neutral-900 disabled:cursor-not-allowed"

/**
 * Height of one ledger row, in pixels: `py-2.5` either side of a `text-sm`
 * line, plus its top border. The windowed path pins rows to it so the spacers
 * can stand in for what is not rendered, which is also why those rows hold
 * their cells to a single line.
 */
const ROW_HEIGHT = 41

/**
 * Below this many rows the table renders in full and every row keeps its
 * natural height. A ledger this short costs nothing to lay out, and long text
 * is free to wrap.
 */
const WINDOW_THRESHOLD = 200

const pillButton =
  "rounded-full px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15 disabled:pointer-events-none disabled:opacity-50"

export function TransactionTable({
  transactions,
  caption,
  categories,
  accounts,
  today,
}: {
  transactions: TransactionDetail[]
  /** Screen-reader description of what the table holds. */
  caption: string
  /** Offered by the detail panel's category and account pickers. */
  categories: Category[]
  accounts: Account[]
  today: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  // Stable, so the panel's close-on-save effect does not re-fire every render.
  const closePanel = useCallback(() => setOpenId(null), [])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // A flip paints before the server answers. Rows arrive fresh from the server
  // after `refresh()`, so a new array is the signal that the overrides have
  // been folded in and can go. Adjusted during render rather than in an
  // effect, so the confirmed rows paint without an extra pass.
  const [paidOverrides, setPaidOverrides] = useState<ReadonlyMap<string, boolean>>(new Map())
  const [seenRows, setSeenRows] = useState(transactions)
  if (transactions !== seenRows) {
    setSeenRows(transactions)
    if (paidOverrides.size > 0) setPaidOverrides(new Map())
  }

  const [, startFlip] = useTransition()

  function flipPaid(id: string, paid: boolean) {
    setPaidOverrides((current) => new Map(current).set(id, paid))
    startFlip(async () => {
      const result = await setTransactionPaid(id, paid)
      if (!result.ok) {
        setError(result.error ?? "Could not change that payment status.")
        // Put the badge back where it was; the server never took the change.
        setPaidOverrides((current) => {
          const next = new Map(current)
          next.delete(id)
          return next
        })
      }
    })
  }

  const net = useMemo(
    () =>
      transactions.reduce(
        (total, entry) =>
          entry.kind === "income" ? total + entry.amount : total - entry.amount,
        0,
      ),
    [transactions],
  )

  // A delete or a filter change can retire an id while it is still ticked, so
  // the live selection is derived from what the table actually holds.
  const picked = useMemo(
    () => transactions.filter((entry) => selected.has(entry.id)).map((entry) => entry.id),
    [transactions, selected],
  )
  const allPicked = picked.length > 0 && picked.length === transactions.length

  // Looked up rather than held: a refresh replaces every row object, and a
  // deleted row must take its own panel down with it.
  const open = transactions.find((entry) => entry.id === openId) ?? null

  // Only a long ledger is windowed; below the threshold this stays null and
  // every row is rendered. Note what is *not* windowed: the net total, the
  // count and the selection all read `transactions`, which still holds every
  // entry, so nothing that counts rows can disagree with what is on screen.
  const body = useRef<HTMLTableSectionElement>(null)
  const windowed = useWindowedRows({
    ref: body,
    count: transactions.length,
    rowHeight: ROW_HEIGHT,
    threshold: WINDOW_THRESHOLD,
  })

  const rows = windowed
    ? transactions.slice(windowed.start, windowed.end)
    : transactions

  function toggle(id: string) {
    setError(null)
    setConfirming(false)
    setSelected((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function clear() {
    setSelected(new Set())
    setConfirming(false)
    setError(null)
  }

  function remove() {
    const ids = picked
    startTransition(async () => {
      const result = await deleteTransactions(ids)
      if (!result.ok) {
        setError(result.error ?? "Could not delete those transactions.")
        return
      }
      clear()
    })
  }

  return (
    <>
      <div className="overflow-x-auto border-t border-black/8">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="bg-neutral-50">
              <th scope="col" className={cn(stickyGutter, "bg-neutral-50 p-0")}>
                <span className="sr-only">Select</span>
              </th>
              <th scope="col" className={cn(stickyDate, "bg-neutral-50", headCell)}>
                Date
              </th>
              <th scope="col" className={cn("min-w-[200px]", headCell)}>
                Category
              </th>
              <th scope="col" className={cn("min-w-[200px]", headCell)}>
                Account
              </th>
              <th scope="col" className={cn("min-w-[120px]", headCell)}>
                Type
              </th>
              <th scope="col" className={cn("min-w-[100px]", headCell)}>
                Status
              </th>
              <th scope="col" className={cn(amountCell, "font-medium text-neutral-700")}>
                Amount
              </th>
            </tr>
          </thead>

          <tbody ref={body}>
            {/* Stands in for the rows above the window. A row with no cell in
                it collapses, so each spacer carries one. */}
            {windowed && windowed.padTop > 0 ? (
              <tr aria-hidden>
                <td colSpan={7} className="p-0" style={{ height: windowed.padTop }} />
              </tr>
            ) : null}

            {rows.map((entry) => (
              <tr
                key={entry.id}
                onClick={() => setOpenId(entry.id)}
                style={windowed ? { height: ROW_HEIGHT } : undefined}
                className={cn(
                  "cursor-pointer border-t border-black/5",
                  // A windowed row must be exactly the height the spacers
                  // assume, so its cells may not wrap onto a second line.
                  windowed && "[&>td]:truncate [&>td]:whitespace-nowrap",
                  selected.has(entry.id) ? "bg-neutral-100" : "hover:bg-neutral-50/70",
                )}
              >
                {/* Ticking a row is not opening it, so the box keeps the click. */}
                <td
                  onClick={(event) => event.stopPropagation()}
                  className={cn(
                    stickyGutter,
                    "px-2 py-2.5 text-center sm:px-3",
                    selected.has(entry.id) ? "bg-neutral-100" : "bg-white",
                  )}
                >
                  <input
                    type="checkbox"
                    className={checkbox}
                    checked={selected.has(entry.id)}
                    disabled={pending}
                    onChange={() => toggle(entry.id)}
                    aria-label={`Select ${formatDate(entry.occurredOn)}, ${entry.category}, ${formatCurrency(entry.amount)}`}
                  />
                </td>
                <td
                  className={cn(
                    stickyDate,
                    "px-3 py-2.5 whitespace-nowrap text-neutral-700",
                    selected.has(entry.id) ? "bg-neutral-100" : "bg-white",
                  )}
                >
                  {/* A row is not focusable, so the real control lives here —
                      the same panel, reachable by keyboard. */}
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      setOpenId(entry.id)
                    }}
                    className="rounded-sm underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-neutral-800"
                  >
                    {formatDate(entry.occurredOn)}
                    <span className="sr-only">
                      {` — open ${entry.category}, ${formatCurrency(entry.amount)}`}
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5 text-neutral-900">{entry.category}</td>
                {/* The name alone repeats across banks, so the bank behind it
                    rides along in the muted half of the cell. */}
                <td className="px-3 py-2.5 text-neutral-700">
                  {entry.account}
                  {entry.accountIssuer ? (
                    <span className="text-neutral-500"> · {entry.accountIssuer}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 capitalize text-neutral-700">{entry.kind}</td>
                <StatusCell
                  entry={
                    paidOverrides.has(entry.id)
                      ? { ...entry, paid: paidOverrides.get(entry.id)! }
                      : entry
                  }
                  onChange={(paid) => flipPaid(entry.id, paid)}
                  disabled={pending}
                />
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

            {windowed && windowed.padBottom > 0 ? (
              <tr aria-hidden>
                <td colSpan={7} className="p-0" style={{ height: windowed.padBottom }} />
              </tr>
            ) : null}

            {transactions.length === 0 ? (
              <tr className="border-t border-black/5">
                <td className={cn(stickyGutter, "bg-white")} />
                <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
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
                <td colSpan={3} className="px-3 py-2.5 font-normal text-neutral-500">
                  {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
                </td>
                {/* Sits directly beside the figure, naming what it is. */}
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

      {/* Floats over the ledger rather than pushing it, so the rows a count
          refers to stay where they were when you ticked them. */}
      {picked.length > 0 ? (
        <div
          role="status"
          className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4 sm:bottom-6"
        >
          <div className="flex max-w-full items-center gap-1 rounded-full bg-neutral-900 py-1.5 pr-1.5 pl-4 text-white shadow-lg shadow-black/25">
            {error ? (
              <p role="alert" className="px-1 text-sm text-rose-300">
                {error}
              </p>
            ) : confirming ? (
              <>
                {/* Nothing recovers a deleted entry, so the count is spelled
                    out once more before it goes. */}
                <span className="text-sm">
                  Delete {picked.length} transaction{picked.length === 1 ? "" : "s"}?
                </span>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={pending}
                  className={pillButton}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={remove}
                  disabled={pending}
                  className={cn(pillButton, "bg-rose-600 hover:bg-rose-500")}
                >
                  {pending ? "Deleting…" : "Delete"}
                </button>
              </>
            ) : (
              <>
                <span className="text-sm tabular-nums">{picked.length} selected</span>
                <span aria-hidden className="mx-1 h-4 w-px bg-white/25" />
                <button
                  type="button"
                  onClick={() => setSelected(new Set(transactions.map((entry) => entry.id)))}
                  disabled={pending || allPicked}
                  className={pillButton}
                >
                  Select all
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={pending}
                  className={cn(pillButton, "flex items-center gap-1.5")}
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                  Delete
                </button>
              </>
            )}

            <button
              type="button"
              onClick={clear}
              disabled={pending}
              aria-label="Clear selection"
              className="ml-0.5 grid size-8 shrink-0 place-items-center rounded-full text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-50"
            >
              <X className="size-4" strokeWidth={2} />
            </button>
          </div>
        </div>
      ) : null}

      {open ? (
        <TransactionPanel
          key={open.id}
          transaction={open}
          categories={categories}
          accounts={accounts}
          today={today}
          onClose={closePanel}
        />
      ) : null}
    </>
  )
}

/**
 * The status badge in the ledger, editable where it stands. Opening the row
 * just to mark a bill settled was the whole friction; this is one click and a
 * pick, and the rest of the row still opens the panel.
 *
 */
function StatusCell({
  entry,
  onChange,
  disabled,
}: {
  entry: TransactionDetail
  onChange: (paid: boolean) => void
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const [container, setContainer] = useState<HTMLElement | null>(null)
  // Narrow list, so it asks for a fixed width instead of matching the trigger.
  const style = usePopoverPosition(triggerRef, open, 120, 132)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node
      if (triggerRef.current?.contains(target)) return
      if (popupRef.current?.contains(target)) return
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open])

  const paid = entry.paid
  const statuses = entry.kind === "income" ? INCOME_PAYMENT_STATUSES : PAYMENT_STATUSES

  return (
    // The badge is a border taller than plain text, so the padding gives the
    // difference back — a windowed row is pinned to ROW_HEIGHT.
    <td
      onClick={(event) => event.stopPropagation()}
      className="px-3 py-[9px]"
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Payment status: ${statuses[paid ? 0 : 1].label}. Change it.`}
        onClick={() => {
          setContainer(popoverContainer(triggerRef.current))
          setOpen((current) => !current)
        }}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 rounded border px-1.5 text-xs leading-5 font-medium",
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-800",
          "disabled:cursor-not-allowed disabled:opacity-50",
          paid
            ? "border-black/10 bg-neutral-50 text-neutral-600 hover:border-black/20"
            : "border-amber-300 bg-amber-50 text-amber-700 hover:border-amber-400",
        )}
      >
        {statuses[paid ? 0 : 1].label}
        <ChevronDown className="size-3 shrink-0" strokeWidth={2} />
      </button>

      {open && container
        ? createPortal(
            <div
              ref={popupRef}
              style={style}
              className="z-[100] overflow-hidden rounded-lg border border-black/10 bg-white py-1 shadow-lg"
            >
              <ul role="listbox" aria-label="Payment status">
                {statuses.map((option) => {
                  const isPaid = option.value === "paid"
                  return (
                    <li
                      key={option.value}
                      role="option"
                      aria-selected={isPaid === paid}
                      onClick={() => {
                        setOpen(false)
                        if (isPaid !== paid) onChange(isPaid)
                      }}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-neutral-800 hover:bg-neutral-100"
                    >
                      <Check
                        className={cn("size-4 shrink-0", isPaid === paid ? "opacity-100" : "opacity-0")}
                        strokeWidth={2}
                      />
                      {option.label}
                    </li>
                  )
                })}
              </ul>
            </div>,
            container,
          )
        : null}
    </td>
  )
}

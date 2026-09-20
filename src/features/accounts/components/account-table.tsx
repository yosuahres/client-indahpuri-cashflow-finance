"use client"

import { useState, useTransition, type ReactNode } from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"

import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import { formatDate } from "@/lib/format"

import { deleteAccount, type Account } from "../actions"
import { ACCOUNT_COLUMNS, DEFAULT_ACCOUNT_COLUMNS, type AccountColumnKey } from "../columns"
import { accountIssuer, accountTypeSpec } from "../constants"

const headCell = "px-2 py-2.5 text-left font-medium text-neutral-700 sm:px-3"
const cell = "px-2 py-2.5 sm:px-3"

const iconButton = cn(
  "grid size-8 place-items-center rounded-md text-neutral-400",
  "hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-neutral-800",
  "disabled:pointer-events-none disabled:opacity-40",
)

function Empty() {
  return <span className="text-neutral-400">—</span>
}

/** How each optional column renders, so its header and its cells stay in step. */
const CELLS: Record<
  AccountColumnKey,
  { className?: string; render: (account: Account) => ReactNode }
> = {
  type: {
    className: "text-neutral-700",
    render: (account) => accountTypeSpec(account.type).label,
  },
  issuer: {
    className: "text-neutral-700",
    render: (account) => accountIssuer(account) ?? <Empty />,
  },
  provider: {
    className: "text-neutral-700",
    render: (account) => account.provider ?? <Empty />,
  },
  holder: {
    className: "text-neutral-700",
    render: (account) => account.holder ?? <Empty />,
  },
  accountNo: {
    className: "tabular-nums text-neutral-700",
    render: (account) => account.accountNo ?? <Empty />,
  },
  notes: {
    className: "text-neutral-700",
    render: (account) => account.notes ?? <Empty />,
  },
  createdAt: {
    className: "whitespace-nowrap text-neutral-700",
    render: (account) => formatDate(account.createdAt.slice(0, 10)),
  },
  ownership: {
    render: (account) => (
      <span
        className={cn(
          "rounded px-2 py-0.5 text-xs font-medium whitespace-nowrap",
          account.isCompanyAccount
            ? "bg-neutral-100 text-neutral-700"
            : "bg-amber-50 text-amber-700",
        )}
      >
        {account.isCompanyAccount ? "Company" : "Personal"}
      </span>
    ),
  },
}

const WIDTHS = Object.fromEntries(
  ACCOUNT_COLUMNS.map((column) => [column.key, column.width]),
) as Record<AccountColumnKey, string>

const LABELS = Object.fromEntries(
  ACCOUNT_COLUMNS.map((column) => [column.key, column.label]),
) as Record<AccountColumnKey, string>

/**
 * Every account, with a way into each one and a way to remove it.
 *
 * Deleting takes two clicks, as on the Anggaran table. Transactions and
 * budgets keep the name they were filed under, so removing an account never
 * takes history with it.
 */
export function AccountTable({
  accounts,
  columns = DEFAULT_ACCOUNT_COLUMNS,
}: {
  accounts: Account[]
  /** Which optional columns to show, in the order they appear. */
  columns?: AccountColumnKey[]
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // A removal paints before the server answers. Rows arrive fresh after
  // `refresh()`, so a new array means the removals have been folded in.
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())
  const [seenRows, setSeenRows] = useState(accounts)
  if (accounts !== seenRows) {
    setSeenRows(accounts)
    if (removed.size > 0) setRemoved(new Set())
  }

  const live = accounts.filter((account) => !removed.has(account.id))

  function remove(id: string) {
    setConfirmingId(null)
    setRemoved((current) => new Set(current).add(id))
    startTransition(async () => {
      const result = await deleteAccount(id)
      if (result.ok) toast.success("Account removed.")
      if (!result.ok) {
        toast.error(result.error ?? "Could not remove that account.")
        setRemoved((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
      }
    })
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Your accounts, each editable and removable.</caption>
          <thead>
            <tr className="bg-neutral-50">
              <th scope="col" className={cn("min-w-[200px]", headCell)}>
                Name
              </th>
              {columns.map((key) => (
                <th key={key} scope="col" className={cn(WIDTHS[key], headCell)}>
                  {LABELS[key]}
                </th>
              ))}
              <th scope="col" className="w-28 px-2 py-2.5">
                <span className="sr-only">Row actions</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {live.map((account) => {
              const confirming = confirmingId === account.id

              return (
                <tr key={account.id} className="border-t border-black/5">
                  <td className={cn(cell, "font-medium text-neutral-900")}>{account.name}</td>
                  {columns.map((key) => (
                    <td key={key} className={cn(cell, CELLS[key].className)}>
                      {CELLS[key].render(account)}
                    </td>
                  ))}
                  <td className="w-28 px-2 py-1.5 text-right">
                    {confirming ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setConfirmingId(null)}
                          className="rounded px-1.5 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(account.id)}
                          disabled={pending}
                          className="rounded bg-rose-600 px-1.5 py-1 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Link
                          href={`/accounts/${account.id}/edit`}
                          aria-label={`Edit ${account.name}`}
                          className={cn(iconButton, "hover:text-neutral-900")}
                        >
                          <Pencil className="size-4" strokeWidth={1.75} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setConfirmingId(account.id)}
                          disabled={pending}
                          aria-label={`Remove ${account.name}`}
                          className={cn(iconButton, "hover:text-rose-600 focus-visible:text-rose-600")}
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} />
                        </button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}

            {live.length === 0 ? (
              <tr className="border-t border-black/5">
                <td colSpan={columns.length + 2} className="px-3 py-6 text-center text-neutral-500">
                  No accounts yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}

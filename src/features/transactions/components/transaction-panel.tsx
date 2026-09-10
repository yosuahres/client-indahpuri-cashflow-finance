"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { Trash2, X } from "lucide-react"

import { DatePicker } from "@/components/form/date-picker"
import { Field, MoneyInput, TextArea, TextInput } from "@/components/form/fields"
import { Select } from "@/components/form/select"
import type { TransactionDetail } from "@/components/report/types"
import { AccountField } from "@/features/accounts/components/account-field"
import type { Account } from "@/features/accounts/actions"
import { CategoryField } from "@/features/categories/components/category-field"
import type { Category } from "@/features/categories/actions"
import { cn } from "@/lib/cn"
import { formatCurrency } from "@/lib/format"
import {
  SECTIONS,
  TRANSACTION_KINDS,
  type SectionValue,
  type TransactionKind,
} from "@/lib/finance"
import type { FormState } from "@/lib/form-state"

import { deleteTransactions, updateTransaction } from "../actions"

const initialState: FormState = {}

/**
 * The whole of one entry, opened from the ledger: the four fields the table has
 * no column for — section, party, reference and notes — alongside the six it
 * shows, all editable in place. Mounted only while a row is open and keyed by
 * its id, so the fields start from that row's values without an effect to sync
 * them.
 */
export function TransactionPanel({
  transaction,
  categories,
  accounts,
  today,
  onClose,
}: {
  transaction: TransactionDetail
  categories: Category[]
  accounts: Account[]
  /** Caps the date picker, computed on the server so it survives hydration. */
  today: string
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, formAction, saving] = useActionState(updateTransaction, initialState)
  const errors = state.fieldErrors ?? {}

  const [categoryList, setCategoryList] = useState(categories)
  const [date, setDate] = useState(transaction.occurredOn)
  const [kind, setKind] = useState<TransactionKind>(transaction.kind)
  const [section, setSection] = useState<SectionValue>(transaction.section as SectionValue)
  const [category, setCategory] = useState(transaction.category)
  const [account, setAccount] = useState(transaction.account)
  const [amount, setAmount] = useState(String(transaction.amount))
  const [party, setParty] = useState(transaction.party)
  const [reference, setReference] = useState(transaction.reference)
  const [notes, setNotes] = useState(transaction.notes)

  const [confirming, setConfirming] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, startDelete] = useTransition()

  const busy = saving || deleting

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  // A save that landed has nothing left to show, so the panel steps out of the
  // way. This has to be an effect: closing is the parent's state, and a child
  // may not update a parent while rendering.
  useEffect(() => {
    if (state.savedAt) onClose()
  }, [state.savedAt, onClose])

  function remove() {
    startDelete(async () => {
      const result = await deleteTransactions([transaction.id])
      if (!result.ok) {
        setDeleteError(result.error ?? "Could not delete this transaction.")
        return
      }
      onClose()
    })
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="transaction-panel-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[42rem] max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto rounded-xl border border-black/10 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <form action={formAction} noValidate>
        <input type="hidden" name="id" value={transaction.id} />

        <div className="sticky top-0 flex items-center gap-3 border-b border-black/8 bg-white px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id="transaction-panel-title" className="text-sm font-semibold text-neutral-900">
              Transaction
            </h2>
            <p
              className={cn(
                "mt-0.5 truncate text-xs tabular-nums",
                transaction.kind === "expense" ? "text-rose-600" : "text-neutral-500",
              )}
            >
              {formatCurrency(transaction.amount)} · {transaction.category}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid size-7 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </div>

        {state.error ? (
          <p role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 sm:px-5">
            {state.error}
          </p>
        ) : null}

        {deleteError ? (
          <p role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800 sm:px-5">
            {deleteError}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 sm:px-5 sm:py-5">
          <Field label="Date" htmlFor="panel-occurredOn" required error={errors.occurredOn}>
            <DatePicker
              id="panel-occurredOn"
              name="occurredOn"
              value={date}
              onValueChange={setDate}
              today={today}
              invalid={Boolean(errors.occurredOn)}
            />
          </Field>

          <Field label="Amount" htmlFor="panel-amount" required error={errors.amount}>
            <MoneyInput
              id="panel-amount"
              name="amount"
              value={amount}
              onValueChange={setAmount}
              invalid={Boolean(errors.amount)}
            />
          </Field>

          <Field label="Type" htmlFor="panel-kind" required error={errors.kind}>
            <Select
              id="panel-kind"
              name="kind"
              value={kind}
              onValueChange={(value) => {
                setKind(value as TransactionKind)
                // Categories belong to one direction, so the old pick is gone.
                setCategory("")
              }}
              options={TRANSACTION_KINDS.map((entry) => ({ value: entry.value, label: entry.label }))}
              invalid={Boolean(errors.kind)}
            />
          </Field>

          <Field label="Cash Flow Section" htmlFor="panel-section" required error={errors.section}>
            <Select
              id="panel-section"
              name="section"
              value={section}
              onValueChange={(value) => {
                setSection(value as SectionValue)
                setCategory("")
              }}
              options={SECTIONS.map((entry) => ({ value: entry.value, label: entry.label }))}
              invalid={Boolean(errors.section)}
            />
          </Field>

          <Field label="Category" htmlFor="panel-category" required error={errors.category}>
            <CategoryField
              id="panel-category"
              name="category"
              kind={kind}
              section={section}
              value={category}
              onValueChange={setCategory}
              categories={categoryList}
              onCategoriesChange={setCategoryList}
              invalid={Boolean(errors.category)}
            />
          </Field>

          <Field label="Account" htmlFor="panel-account" required error={errors.account}>
            <AccountField
              id="panel-account"
              name="account"
              value={account}
              onValueChange={setAccount}
              accounts={accounts}
              invalid={Boolean(errors.account)}
            />
          </Field>

          <Field label="Party" htmlFor="panel-party" hint="Customer or supplier, if this involves one.">
            <TextInput
              id="panel-party"
              name="party"
              value={party}
              onChange={(event) => setParty(event.target.value)}
              placeholder="Optional"
            />
          </Field>

          <Field label="Reference No." htmlFor="panel-reference">
            <TextInput
              id="panel-reference"
              name="reference"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Invoice or receipt number"
            />
          </Field>

          <Field
            label="Description"
            htmlFor="panel-notes"
            className="sm:col-span-2"
          >
            <TextArea
              id="panel-notes"
              name="notes"
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="What was this for?"
            />
          </Field>
        </div>

        {/* Delete sits apart from Save, at the opposite end of the footer. */}
        <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-2 border-t border-black/8 bg-white px-4 py-3 sm:px-5">
          {confirming ? (
            <>
              <span className="mr-auto text-sm text-neutral-700">Delete this transaction?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={busy}
                className="rounded-md px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDeleteError(null)
                setConfirming(true)
              }}
              disabled={busy}
              className="mr-auto inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              Delete
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="shrink-0 rounded-md border border-black/10 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:border-black/20 disabled:opacity-50"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-md bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white hover:opacity-85 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </dialog>
  )
}

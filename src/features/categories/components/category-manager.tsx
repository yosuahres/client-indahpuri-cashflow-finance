"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Plus, Trash2, X } from "lucide-react"

import { Select } from "@/components/form/select"
import {
  CATEGORY_SUGGESTIONS,
  SECTIONS,
  TRANSACTION_KINDS,
  type SectionValue,
  type TransactionKind,
} from "@/lib/finance"
import { cn } from "@/lib/cn"

import { addCategory, deleteCategory, seedCategories, type Category } from "../actions"

/** Section labels are shown per row, so the lookup is worth doing once. */
const SECTION_LABEL: Record<SectionValue, string> = Object.fromEntries(
  SECTIONS.map((entry) => [entry.value, entry.label]),
) as Record<SectionValue, string>

/**
 * Add/remove panel behind the category dropdown. Uses a native `<dialog>` so
 * focus trapping, Escape and the backdrop come from the platform.
 */
export function CategoryManager({
  open,
  onClose,
  categories,
  onCategoriesChange,
  defaultKind,
  defaultSection,
}: {
  open: boolean
  onClose: () => void
  categories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  /** The panel opens on whatever the form is currently filing under. */
  defaultKind: TransactionKind
  defaultSection: SectionValue
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [kind, setKind] = useState<TransactionKind>(defaultKind)
  const [section, setSection] = useState<SectionValue>(defaultSection)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function run(action: () => Promise<{ ok: boolean; error?: string; categories: Category[] }>) {
    startTransition(async () => {
      const result = await action()
      onCategoriesChange(result.categories)
      setError(result.ok ? null : (result.error ?? null))
    })
  }

  function submitNew() {
    if (!name.trim()) return
    const pendingName = name
    setName("")
    run(async () => addCategory(pendingName, section, kind))
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="category-manager-title"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[32rem] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-black/10 bg-white p-0 shadow-xl backdrop:bg-black/40"
    >
      <div className="flex items-center gap-3 border-b border-black/8 px-4 py-3.5 sm:px-5">
        <h2 id="category-manager-title" className="flex-1 text-sm font-semibold text-neutral-900">
          Manage categories
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="grid size-7 place-items-center rounded-md text-neutral-500 hover:bg-neutral-100"
        >
          <X className="size-4" strokeWidth={2} />
        </button>
      </div>

      {error ? (
        <p role="alert" className="border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      {/* Add */}
      <div className="flex flex-col gap-2 border-b border-black/8 px-4 py-4 sm:flex-row sm:items-end sm:px-5">
        <div className="flex-1">
          <label htmlFor="new-category" className="mb-1.5 block text-xs text-neutral-600">
            New category
          </label>
          <input
            id="new-category"
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                submitNew()
              }
            }}
            placeholder="e.g. Marketing"
            className="h-10 w-full rounded-md bg-neutral-100 px-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-neutral-800 sm:h-9 sm:text-sm"
          />
        </div>
        <div className="w-full sm:w-32">
          <label htmlFor="new-category-kind" className="mb-1.5 block text-xs text-neutral-600">
            Direction
          </label>
          <Select
            id="new-category-kind"
            value={kind}
            onValueChange={(value) => setKind(value as TransactionKind)}
            options={TRANSACTION_KINDS.map((entry) => ({ value: entry.value, label: entry.short }))}
          />
        </div>
        <div className="w-full sm:w-36">
          <label htmlFor="new-category-section" className="mb-1.5 block text-xs text-neutral-600">
            Section
          </label>
          <Select
            id="new-category-section"
            value={section}
            onValueChange={(value) => setSection(value as SectionValue)}
            options={SECTIONS.map((entry) => ({ value: entry.value, label: entry.label }))}
          />
        </div>
        <button
          type="button"
          onClick={submitNew}
          disabled={pending || !name.trim()}
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-neutral-900 px-3 text-sm font-medium text-white hover:opacity-85 disabled:pointer-events-none disabled:opacity-40 sm:h-9"
        >
          <Plus className="size-4" strokeWidth={2.5} />
          Add
        </button>
      </div>

      {/* List */}
      <div className={cn("max-h-80 overflow-y-auto px-4 py-3 sm:px-5", pending && "opacity-60")}>
        {categories.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-neutral-500">No categories yet.</p>
            <button
              type="button"
              onClick={() => run(async () => seedCategories(CATEGORY_SUGGESTIONS))}
              disabled={pending}
              className="mt-3 rounded-md border border-black/15 px-3 py-1.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-40"
            >
              Add {CATEGORY_SUGGESTIONS.length} suggested categories
            </button>
          </div>
        ) : (
          // Grouped by direction, which is what the dropdown filters on.
          // Section rides along on each row rather than nesting a second level
          // of headings inside a panel this small.
          TRANSACTION_KINDS.map((entry) => {
            const inKind = categories.filter((category) => category.kind === entry.value)
            if (inKind.length === 0) return null

            return (
              <div key={entry.value} className="mb-4 last:mb-0">
                <h3 className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
                  {entry.short}
                </h3>
                <ul>
                  {inKind.map((category) => (
                    <li
                      key={category.id}
                      className="flex items-center gap-2 border-b border-black/5 py-1.5 last:border-b-0"
                    >
                      <span className="flex-1 truncate text-sm text-neutral-800">
                        {category.name}
                      </span>
                      <span className="shrink-0 text-xs text-neutral-500">
                        {SECTION_LABEL[category.section]}
                      </span>
                      <button
                        type="button"
                        onClick={() => run(async () => deleteCategory(category.id))}
                        disabled={pending}
                        aria-label={`Delete ${category.name}`}
                        className="grid size-7 place-items-center rounded-md text-neutral-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })
        )}
      </div>

      <div className="border-t border-black/8 px-4 py-3 sm:px-5">
        <p className="text-xs text-neutral-500">
          Deleting a category never changes past transactions — they keep the name
          they were filed under.
        </p>
      </div>
    </dialog>
  )
}

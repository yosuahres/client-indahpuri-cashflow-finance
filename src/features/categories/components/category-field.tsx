"use client"

import { useState } from "react"
import { Settings2 } from "lucide-react"

import { Select } from "@/components/form/select"
import type { SectionValue, TransactionKind } from "@/lib/finance"

import type { Category } from "../actions"
import { CategoryManager } from "./category-manager"

/**
 * Category dropdown whose only extra affordance is "Manage categories" —
 * adding and removing happens in the panel, not inline in the list.
 */
export function CategoryField({
  id,
  name,
  kind,
  section,
  value,
  onValueChange,
  categories,
  onCategoriesChange,
  invalid,
}: {
  id: string
  name: string
  /** Money in or money out — an income entry is never offered an expense category. */
  kind: TransactionKind
  /** Only categories filed under this section are offered. */
  section: SectionValue
  value: string
  onValueChange: (value: string) => void
  categories: Category[]
  onCategoriesChange: (categories: Category[]) => void
  invalid?: boolean
}) {
  const [managing, setManaging] = useState(false)

  const options = categories
    .filter((category) => category.kind === kind && category.section === section)
    .map((category) => ({ value: category.name, label: category.name }))

  return (
    <>
      <Select
        id={id}
        name={name}
        value={value}
        onValueChange={onValueChange}
        options={options}
        invalid={invalid}
        placeholder={
          options.length === 0
            ? `No ${kind} categories here — add one`
            : "Select a category…"
        }
        footer={(close) => (
          <button
            type="button"
            onClick={() => {
              close()
              setManaging(true)
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            <Settings2 className="size-4 text-neutral-500" strokeWidth={1.75} />
            Manage categories
          </button>
        )}
      />

      <CategoryManager
        open={managing}
        onClose={() => setManaging(false)}
        categories={categories}
        onCategoriesChange={(next) => {
          onCategoriesChange(next)
          // The selected category may have just been deleted, or moved to the
          // other direction, where this entry can no longer use it.
          const stillOffered = next.some(
            (entry) => entry.kind === kind && entry.section === section && entry.name === value,
          )
          if (value && !stillOffered) onValueChange("")
        }}
        defaultKind={kind}
        defaultSection={section}
      />
    </>
  )
}

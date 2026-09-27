"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { Select } from "@/components/form/select"
import { cn } from "@/lib/cn"

import { ManageTypesFooter } from "./manage-types-footer"

const STEP =
  "grid size-10 shrink-0 cursor-pointer place-items-center rounded-md bg-neutral-100 text-neutral-600 hover:text-neutral-900"

/**
 * Which year and leave type the entitlement sheet shows. Both sit in the URL, so a
 * sheet is shareable and comes back from the server already filled.
 */
export function EntitlementPicker({
  year,
  leaveTypeId,
  types,
}: {
  year: number
  leaveTypeId: string
  types: { id: string; name: string }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  function set(key: string, value: string) {
    const params = new URLSearchParams(searchParams)
    params.set(key, value)
    startTransition(() => {
      router.replace(`${pathname}?${params}`, { scroll: false })
    })
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6", pending && "opacity-60")}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => set("year", String(year - 1))}
          aria-label="Previous year"
          className={STEP}
        >
          <ChevronLeft className="size-4" strokeWidth={2} />
        </button>
        <span className="w-14 text-center text-sm font-medium text-neutral-900 tabular-nums">
          {year}
        </span>
        <button
          type="button"
          onClick={() => set("year", String(year + 1))}
          aria-label="Next year"
          className={STEP}
        >
          <ChevronRight className="size-4" strokeWidth={2} />
        </button>
      </div>

      <div className="w-full sm:w-48">
        <label htmlFor="entitlement-type" className="sr-only">
          Leave type
        </label>
        <Select
          id="entitlement-type"
          value={leaveTypeId}
          onValueChange={(value) => set("type", value)}
          options={types.map((type) => ({ value: type.id, label: `${type.name} leave` }))}
          placeholder={types.length === 0 ? "No leave types yet" : "Choose a type"}
          footer={() => <ManageTypesFooter />}
        />
      </div>
    </div>
  )
}

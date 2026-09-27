import Link from "next/link"
import { Settings2 } from "lucide-react"

/**
 * The line under a leave type dropdown that opens the Leave Types page, as
 * "Manage categories" sits under the category picker.
 */
export function ManageTypesFooter() {
  return (
    <Link
      href="/hris/leave/types"
      className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
    >
      <Settings2 className="size-4 text-neutral-500" strokeWidth={1.75} />
      Manage leave types
    </Link>
  )
}

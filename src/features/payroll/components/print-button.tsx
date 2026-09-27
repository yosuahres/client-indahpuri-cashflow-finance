"use client"

import { Printer } from "lucide-react"

import { TOPBAR_ACTION_CLASS } from "@/components/layout/topbar"

/** Opens the browser's print dialog, where the payslip can also be saved as a PDF. */
export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={TOPBAR_ACTION_CLASS}>
      <Printer className="size-4" strokeWidth={2} />
      Print
    </button>
  )
}

import { LayoutDashboard, PlusCircle, ScanEye, type LucideIcon } from "lucide-react"

export type NavItem = {
  label: string
  /** Omitted while the page has not been built yet. */
  href?: string
}

export type NavLink = {
  label: string
  href: string
  icon: LucideIcon
}

/** Standalone links, pinned above the collapsible groups. */
export const NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
]

export type NavGroup = {
  label: string
  icon: LucideIcon
  defaultOpen: boolean
  items: NavItem[]
}

/**
 * Only pages that actually exist are listed. Add an item back here as each
 * one gets built — nothing else needs to change.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Financial Reports",
    icon: ScanEye,
    defaultOpen: true,
    items: [
      { label: "Laporan Keuangan", href: "/reporting" },
      { label: "Profit and Loss", href: "/profit-and-loss" },
    ],
  },
  {
    label: "Entries",
    icon: PlusCircle,
    defaultOpen: true,
    items: [
      { label: "New Transaction", href: "/transactions/new" },
      { label: "New Budget", href: "/budgets/new" },
      { label: "New Account", href: "/accounts/new" },
    ],
  },
]

import { LayoutDashboard, PlusCircle, ScanEye, Settings2, type LucideIcon } from "lucide-react"

import { canVisit, type Role } from "@/features/auth/roles"

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
      { label: "Anggaran", href: "/budgets" },
      { label: "Accounts", href: "/accounts" },
    ],
  },
  {
    label: "Entries",
    icon: PlusCircle,
    defaultOpen: true,
    items: [
      { label: "New Transaction", href: "/transactions/new" },
      { label: "Budget Plan", href: "/budgets/new" },
      { label: "New Account", href: "/accounts/new" },
    ],
  },
  {
    label: "Management",
    icon: Settings2,
    defaultOpen: true,
    items: [{ label: "Users", href: "/users" }],
  },
]

/**
 * The links and groups a role can actually open. A group left with nothing in
 * it is dropped rather than shown as an empty heading.
 */
export function navFor(role: Role | null) {
  return {
    links: NAV_LINKS.filter((link) => canVisit(role, link.href)),
    groups: NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href && canVisit(role, item.href)),
    })).filter((group) => group.items.length > 0),
  }
}

import {
  CircleUserRound,
  KeyRound,
  LayoutDashboard,
  PlusCircle,
  ScanEye,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { canVisit, type Permission } from "@/features/auth/permissions"
import type { Role } from "@/features/auth/roles"

/** What a sidebar can be showing: the finance app, or Settings, which sits apart from it. */
export type SidebarArea = "finance" | "settings"

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

export type NavGroup = {
  label: string
  icon: LucideIcon
  defaultOpen: boolean
  items: NavItem[]
}

type ModuleNav = {
  /** Standalone links, pinned above the collapsible groups. */
  links: NavLink[]
  groups: NavGroup[]
}

/**
 * Each area's own sidebar. Only pages that actually exist are listed. Add an
 * item here as each one gets built — nothing else needs to change.
 */
const FINANCE_NAV: ModuleNav = {
  links: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  groups: [
    {
      label: "Financial Reports",
      icon: ScanEye,
      defaultOpen: true,
      items: [
        { label: "Laporan Keuangan", href: "/reporting" },
        { label: "Detail Transaction", href: "/profit-and-loss" },
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
  ],
}

/** Your own account, and for whoever manages users, the team's. */
const SETTINGS_NAV: ModuleNav = {
  links: [
    { label: "Account", href: "/settings/account", icon: CircleUserRound },
    { label: "Users", href: "/settings/users", icon: UsersRound },
    { label: "Roles", href: "/settings/roles", icon: ShieldCheck },
    { label: "Permissions", href: "/settings/permissions", icon: KeyRound },
  ],
  groups: [],
}

const NAV: Record<SidebarArea, ModuleNav> = {
  finance: FINANCE_NAV,
  settings: SETTINGS_NAV,
}

/**
 * The links and groups a role can actually open. A group left with nothing in
 * it is dropped rather than shown as an empty heading.
 */
export function navFor(module: SidebarArea, role: Role | null, permissions: readonly Permission[]) {
  const { links, groups } = NAV[module]
  return {
    links: links.filter((link) => canVisit(role, permissions, link.href)),
    groups: groups.map((group) => ({
      ...group,
      items: group.items.filter((item) => item.href && canVisit(role, permissions, item.href)),
    })).filter((group) => group.items.length > 0),
  }
}

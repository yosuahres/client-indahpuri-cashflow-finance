import {
  CalendarCheck,
  CircleUserRound,
  KeyRound,
  LayoutDashboard,
  PlaneTakeoff,
  PlusCircle,
  ScanEye,
  Settings2,
  ShieldCheck,
  UsersRound,
  type LucideIcon,
} from "lucide-react"

import { canVisit, isGated, type Permission } from "@/features/auth/permissions"
import type { Role } from "@/features/auth/roles"

import { MODULES, type AppModule, type AreaKey, type ModuleArea, type ModuleKey } from "./modules"

/**
 * What a sidebar can be showing: one of the apps, an area that runs its own
 * navigation, or Settings, which sits apart from them all.
 */
export type SidebarArea = ModuleKey | AreaKey | "settings"

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
 * Each app's own sidebar. Only pages that actually exist are listed. Add an
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

const HRIS_NAV: ModuleNav = {
  links: [
    { label: "Dashboard", href: "/hris/dashboard", icon: LayoutDashboard },
    { label: "Employees", href: "/hris/employees", icon: UsersRound },
  ],
  groups: [
    {
      label: "Setup",
      icon: Settings2,
      defaultOpen: true,
      items: [{ label: "Department", href: "/hris/departments" }],
    },
  ],
}

/**
 * Shift & Attendance keeps its own sidebar rather than a group inside HRIS:
 * the people who take the roll every day work here and nowhere else.
 */
const SHIFT_NAV: ModuleNav = {
  links: [
    { label: "Dashboard", href: "/hris/attendance/dashboard", icon: LayoutDashboard },
    { label: "Attendance", href: "/hris/attendance", icon: CalendarCheck },
    { label: "Leave", href: "/hris/leave", icon: PlaneTakeoff },
  ],
  groups: [
    {
      label: "Setup",
      icon: Settings2,
      defaultOpen: true,
      items: [{ label: "Shifts", href: "/hris/attendance/shifts" }],
    },
  ],
}

/** Your own account, and for managers the team's. Not an app of its own, so not in the switcher. */
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
  hris: HRIS_NAV,
  shift: SHIFT_NAV,
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

/**
 * Which entry the sidebar marks as the page you are on: the longest href the
 * path sits under. Picking the longest rather than the first keeps Dashboard
 * lit on /hris/attendance/dashboard instead of Attendance above it.
 */
export function activeHref(nav: ReturnType<typeof navFor>, pathname: string): string | null {
  const hrefs = [
    ...nav.links.map((link) => link.href),
    ...nav.groups.flatMap((group) => group.items.map((item) => item.href)),
  ]

  let best: string | null = null
  for (const href of hrefs) {
    if (!href) continue
    if (pathname !== href && !pathname.startsWith(`${href}/`)) continue
    if (!best || href.length > best.length) best = href
  }
  return best
}

/** Which sidebar an area opens: its own, or the app's when it has none of its own. */
function sidebarOf(module: AppModule, area: ModuleArea): SidebarArea {
  return area.area ?? module.key
}

/**
 * Is there anything in this sidebar for them? Only pages that ask for a
 * permission count: every app opens on a dashboard that anyone with a role may
 * see, so counting those would make every app look like theirs.
 */
export function canOpen(
  area: SidebarArea,
  role: Role | null,
  permissions: readonly Permission[],
): boolean {
  const nav = navFor(area, role, permissions)
  return [
    ...nav.links.map((link) => link.href),
    ...nav.groups.flatMap((group) => group.items.map((item) => item.href)),
  ].some((href) => Boolean(href) && isGated(href!))
}

/**
 * The areas of an app worth showing someone. One still being built has no
 * sidebar to ask, so it rides along as "Soon" wherever the app itself shows.
 */
export function openableAreas(
  module: AppModule,
  role: Role | null,
  permissions: readonly Permission[],
): ModuleArea[] {
  return (module.areas ?? []).filter(
    (area) => !area.href || canOpen(sidebarOf(module, area), role, permissions),
  )
}

/**
 * Every app with something in it for them, in launcher order. An app split into
 * areas needs one they can actually open — a panel of nothing but "Soon" is not
 * a way in.
 */
export function openableModules(
  role: Role | null,
  permissions: readonly Permission[],
): AppModule[] {
  return MODULES.filter((module) =>
    module.areas
      ? module.areas.some(
          (area) => area.href && canOpen(sidebarOf(module, area), role, permissions),
        )
      : canOpen(module.key, role, permissions),
  )
}

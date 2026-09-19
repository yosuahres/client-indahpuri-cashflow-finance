import { Banknote, CalendarClock, UserCog, Users, Wallet, type LucideIcon } from "lucide-react"

export type ModuleKey = "finance" | "hris"

/**
 * An area inside a module that runs its own sidebar, so opening it feels like
 * opening an app of its own rather than a page inside another one.
 */
export type AreaKey = "shift"

/** One area inside a module, shown in its panel on the home launcher. */
export type ModuleArea = {
  name: string
  icon: LucideIcon
  /** Null while the area is not built yet — shown, but not clickable. */
  href: string | null
  /** Set when the area has a sidebar of its own, and so a place in the switcher. */
  area?: AreaKey
}

export type AppModule = {
  key: ModuleKey
  name: string
  icon: LucideIcon
  /** Null while the module is not built yet — shown, but not clickable. */
  href: string | null
  /** When given, the home tile opens a panel of these instead of going straight in. */
  areas?: ModuleArea[]
}

/** Every app the company runs. Shared by the home launcher and the sidebar switcher. */
export const MODULES: AppModule[] = [
  {
    key: "finance",
    name: "Finance",
    icon: Wallet,
    href: "/dashboard",
  },
  {
    key: "hris",
    name: "HRIS",
    icon: Users,
    href: "/hris/dashboard",
    areas: [
      { name: "HR Setup", icon: UserCog, href: "/hris/dashboard" },
      { name: "Payroll", icon: Banknote, href: null },
      {
        name: "Shift & Attendance",
        icon: CalendarClock,
        href: "/hris/attendance/dashboard",
        area: "shift",
      },
    ],
  },
]

/** One destination in the sidebar's switcher. */
export type SwitchTarget = {
  key: ModuleKey | AreaKey
  name: string
  icon: LucideIcon
  href: string | null
}

/**
 * What the switcher offers: every app, each followed by the areas inside it
 * that have a sidebar of their own. Derived from `MODULES` so the launcher and
 * the switcher never drift apart.
 */
export const SWITCH_TARGETS: SwitchTarget[] = MODULES.flatMap((module) => [
  { key: module.key, name: module.name, icon: module.icon, href: module.href },
  ...(module.areas ?? [])
    .filter((area): area is ModuleArea & { area: AreaKey } => Boolean(area.area))
    .map((area) => ({ key: area.area, name: area.name, icon: area.icon, href: area.href })),
])

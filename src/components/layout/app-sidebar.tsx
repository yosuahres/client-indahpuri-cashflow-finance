"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { ChevronDown, ChevronRight, ChevronsUpDown, X } from "lucide-react"

import { cn } from "@/lib/cn"
import { NAV_GROUPS, NAV_LINKS, type NavGroup } from "./nav-config"
import { useSidebar } from "./sidebar-state"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function NavLinks() {
  const pathname = usePathname()

  return (
    <ul className="mb-1">
      {NAV_LINKS.map((link) => {
        const active = pathname === link.href
        const Icon = link.icon

        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-2 text-sm sm:py-1.5",
                active
                  ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-black/5"
                  : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
              )}
            >
              <Icon className="size-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
              <span className="flex-1 truncate text-left">{link.label}</span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

function NavGroupBlock({ group }: { group: NavGroup }) {
  const [open, setOpen] = useState(group.defaultOpen)
  const pathname = usePathname()
  const Icon = group.icon
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 sm:py-1.5"
      >
        <Icon className="size-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
        <span className="flex-1 text-left">{group.label}</span>
        <Chevron className="size-4 shrink-0 text-neutral-400" strokeWidth={2} />
      </button>

      {open ? (
        <ul className="mt-0.5">
          {group.items.map((item) => {
            const active = item.href ? pathname === item.href : false

            return (
              <li key={item.label}>
                {item.href ? (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "block truncate rounded-md py-2 pr-2 pl-8 text-sm sm:py-1.5",
                      active
                        ? "bg-white font-medium text-neutral-900 shadow-sm ring-1 ring-black/5"
                        : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                    )}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    title="Not built yet"
                    className="block cursor-default truncate rounded-md py-2 pr-2 pl-8 text-sm text-neutral-400 sm:py-1.5"
                  >
                    {item.label}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

type SidebarUser = { name: string; email: string }

/** Everything inside the panel — shared by the fixed desktop rail and the drawer. */
function SidebarBody({
  user,
  onSignOut,
  onClose,
}: {
  user: SidebarUser
  onSignOut: React.ReactNode
  /** Rendered as a close button in the drawer; absent on desktop. */
  onClose?: () => void
}) {
  return (
    <>
      {/* Workspace switcher */}
      <div className="flex items-center gap-1 p-3">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            IP
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900">
              Indah Puri
            </span>
            <span className="block truncate text-xs text-neutral-500">
              Cash Flow
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-neutral-400" strokeWidth={2} />
        </button>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid size-9 shrink-0 place-items-center rounded-md text-neutral-500 hover:bg-neutral-200 hover:text-neutral-900"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      {/* Report navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <NavLinks />
        {NAV_GROUPS.map((group) => (
          <NavGroupBlock key={group.label} group={group} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-black/8 p-3">
        <div className="flex items-center gap-2.5 rounded-md px-2 py-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-rose-100 text-xs font-semibold text-rose-700">
            {initials(user.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-neutral-900">
              {user.name}
            </span>
            <span className="block truncate text-xs text-neutral-500">
              {user.email}
            </span>
          </span>
          {onSignOut}
        </div>
      </div>
    </>
  )
}

export function AppSidebar({
  user,
  onSignOut,
}: {
  user: SidebarUser
  onSignOut: React.ReactNode
}) {
  const { open, setOpen } = useSidebar()

  return (
    <>
      {/* Desktop rail */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-black/8 bg-neutral-50 lg:flex">
        <SidebarBody user={user} onSignOut={onSignOut} />
      </aside>

      {/* Off-canvas drawer, below lg. Kept mounted so it can slide, and inert
          while closed so nothing inside it takes focus. */}
      <div
        className={cn("fixed inset-0 z-40 lg:hidden", !open && "pointer-events-none")}
        inert={!open}
      >
        <div
          aria-hidden
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity duration-200",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        <div
          role="dialog"
          aria-modal={open}
          aria-label="Navigation"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col border-r border-black/8 bg-neutral-50 shadow-xl transition-transform duration-200",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody
            user={user}
            onSignOut={onSignOut}
            onClose={() => setOpen(false)}
          />
        </div>
      </div>
    </>
  )
}

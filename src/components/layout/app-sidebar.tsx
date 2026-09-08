"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Bell,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Search,
} from "lucide-react"

import { cn } from "@/lib/cn"
import { NAV_GROUPS, type NavGroup } from "./nav-config"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
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
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
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
                      "block truncate rounded-md py-1.5 pr-2 pl-8 text-sm",
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
                    className="block cursor-default truncate rounded-md py-1.5 pr-2 pl-8 text-sm text-neutral-400"
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

export function AppSidebar({
  user,
  onSignOut,
}: {
  user: { name: string; email: string }
  onSignOut: React.ReactNode
}) {
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-black/8 bg-neutral-50">
      {/* Workspace switcher */}
      <div className="p-3">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            IP
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-neutral-900">
              Financial Reports
            </span>
            <span className="block truncate text-xs text-neutral-500">
              Indah Puri
            </span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-neutral-400" strokeWidth={2} />
        </button>
      </div>

      {/* Global actions */}
      <div className="px-3 pb-2">
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
        >
          <Search className="size-4 text-neutral-500" strokeWidth={1.75} />
          <span className="flex-1 text-left">Search</span>
          <kbd className="font-sans text-xs text-neutral-400">⌘+K</kbd>
        </button>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
        >
          <Bell className="size-4 text-neutral-500" strokeWidth={1.75} />
          <span className="flex-1 text-left">Notification</span>
        </button>
      </div>

      {/* Report navigation */}
      <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
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
    </aside>
  )
}

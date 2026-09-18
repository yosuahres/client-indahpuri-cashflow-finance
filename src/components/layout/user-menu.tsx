"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { LogOut, Palette, Settings } from "lucide-react"

import { cn } from "@/lib/cn"
import type { Permission } from "@/features/auth/permissions"
import type { Role } from "@/features/auth/roles"

import { ThemeDialog } from "./theme-dialog"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const row = "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm"

function SignOutItem() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className={cn(row, "text-neutral-800 hover:bg-neutral-100 disabled:cursor-default disabled:opacity-40")}
    >
      <LogOut className="size-4 shrink-0 text-neutral-700" strokeWidth={1.75} />
      Logout
    </button>
  )
}

/** Sidebar footer: the signed-in user, opening up to their account actions. */
export function UserMenu({
  user,
  signOut,
}: {
  user: {
    name: string
    email: string
    role: Role | null
    roleName: string | null
    permissions: Permission[]
  }
  signOut: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const userInitials = initials(user.name)

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (rootRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      // Stop the drawer from closing on the same Escape.
      if (event.key !== "Escape") return
      event.stopImmediatePropagation()
      setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown, true)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown, true)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-black/10 bg-white shadow-lg"
        >
          <div className="flex items-center gap-3 border-b border-black/8 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-neutral-900 text-sm font-semibold text-white">
              {userInitials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-semibold text-neutral-900">
                  {user.name}
                </span>
                <span className="shrink-0 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-neutral-500 uppercase">
                  {user.roleName ?? "No access"}
                </span>
              </span>
              <span className="block truncate text-xs text-neutral-500">{user.email}</span>
            </span>
          </div>

          <div className="p-1">
            {/* Everyone has an Account page; managers land on Users instead. */}
            {user.role ? (
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(row, "text-neutral-800 hover:bg-neutral-100")}
              >
                <Settings className="size-4 shrink-0 text-neutral-700" strokeWidth={1.75} />
                Settings
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              aria-haspopup="dialog"
              onClick={() => {
                setOpen(false)
                setThemeOpen(true)
              }}
              className={cn(row, "text-neutral-800 hover:bg-neutral-100")}
            >
              <Palette className="size-4 shrink-0 text-neutral-700" strokeWidth={1.75} />
              Switch Theme
            </button>

            <div className="mx-1 my-1 border-t border-black/8" />

            <form action={signOut}>
              <SignOutItem />
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100",
          open && "bg-neutral-100",
        )}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-neutral-900 text-xs font-semibold text-white">
          {userInitials}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-900">
          {user.name}
        </span>
      </button>

      {/* Outside the menu, which unmounts as the dialog opens. */}
      <ThemeDialog open={themeOpen} onClose={() => setThemeOpen(false)} />
    </div>
  )
}

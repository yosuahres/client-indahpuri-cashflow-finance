"use client"

import Link from "next/link"
import { useRef } from "react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@/lib/cn"
import type { Permission } from "@/features/auth/permissions"
import type { Role } from "@/features/auth/roles"

import { MODULES, type ModuleKey } from "./modules"
import { openableAreas } from "./nav-config"

/** Every tile is the same width, so every name gets the same room. */
const tile = "group flex w-24 cursor-pointer flex-col items-center text-center"
/** Keyboard focus grows the icon, as hover does, instead of drawing an outline. */
const focusRing = "outline-none"

function TileFace({ name, icon: Icon, soon }: { name: string; icon: LucideIcon; soon?: boolean }) {
  return (
    <>
      <span className="relative flex size-16 items-center justify-center rounded-2xl bg-neutral-900 text-white shadow-sm transition-transform group-hover:scale-105 group-focus-visible:scale-110 group-focus-visible:shadow-lg">
        <Icon className="size-8" strokeWidth={1.75} />
        {soon ? (
          <span className="absolute -top-2 -right-2 rounded-full border border-black/8 bg-white px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
            Soon
          </span>
        ) : null}
      </span>
      {/* Long names wrap to a second line, then give way, rather than push
          the grid apart. Two lines are always reserved so the tiles line up. */}
      <span className="mt-2 line-clamp-2 min-h-10 w-full text-sm leading-5 font-medium break-words text-neutral-900">
        {name}
      </span>
    </>
  )
}

/**
 * One app on the home launcher. A module split into areas opens a panel of
 * them; any other goes straight in.
 */
export function ModuleTile({
  moduleKey,
  role,
  permissions,
}: {
  moduleKey: ModuleKey
  role: Role | null
  permissions: Permission[]
}) {
  // Looked up here rather than passed in: icons are components, and a Server
  // Component cannot hand a function to a Client Component.
  const app = MODULES.find((entry) => entry.key === moduleKey)!
  const { name, icon, href } = app
  // Only the areas they can get into, so the panel never offers a dead end.
  const areas = app.areas ? openableAreas(app, role, permissions) : undefined
  const dialogRef = useRef<HTMLDialogElement>(null)

  if (!href) {
    return (
      <div aria-disabled className={cn(tile, "cursor-default opacity-60")}>
        <TileFace name={name} icon={icon} soon />
      </div>
    )
  }

  if (!areas) {
    return (
      <Link href={href} className={cn(tile, focusRing)}>
        <TileFace name={name} icon={icon} />
      </Link>
    )
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(tile, focusRing)}
      >
        <TileFace name={name} icon={icon} />
      </button>

      <dialog
        ref={dialogRef}
        // Focus lands on the panel itself when it opens, not on its first tile.
        autoFocus
        aria-labelledby={`${moduleKey}-areas`}
        // A click on the dimmed space around the panel lands on the dialog itself.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        className="m-auto w-full max-w-2xl bg-transparent p-4 outline-none backdrop:bg-scrim/60 open:flex open:flex-col open:items-center"
      >
        <h2 id={`${moduleKey}-areas`} className="mb-6 text-2xl font-medium text-white">
          {name}
        </h2>

        <ul className="grid w-full grid-cols-3 justify-items-center gap-x-4 gap-y-8 rounded-3xl bg-white px-6 py-10 shadow-xl sm:grid-cols-4 sm:px-10">
          {areas.map((area) => (
            <li key={area.name}>
              {area.href ? (
                <Link
                  href={area.href}
                  onClick={() => dialogRef.current?.close()}
                  className={cn(tile, focusRing)}
                >
                  <TileFace name={area.name} icon={area.icon} />
                </Link>
              ) : (
                <div aria-disabled className={cn(tile, "cursor-default opacity-60")}>
                  <TileFace name={area.name} icon={area.icon} soon />
                </div>
              )}
            </li>
          ))}
        </ul>
      </dialog>
    </>
  )
}

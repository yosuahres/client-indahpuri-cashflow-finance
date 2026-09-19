"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
  type RefObject,
} from "react"
import { useFormStatus } from "react-dom"
import {
  Check,
  ChevronRight,
  ChevronsUpDown,
  House,
  LayoutGrid,
  LogOut,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/cn"
import type { Permission } from "@/features/auth/permissions"
import type { Role } from "@/features/auth/roles"

import { SWITCH_TARGETS, type AreaKey, type ModuleKey } from "./modules"
import { openableAreas, openableModules } from "./nav-config"

type SwitchKey = ModuleKey | AreaKey

/** One line in the menu. A node with `children` opens a panel rather than navigating. */
type MenuNode = {
  name: string
  icon: LucideIcon
  /** Null while the workspace is not built yet — shown, but not clickable. */
  href: string | null
  /** Set when opening this line lands you in that sidebar, so it can be ticked. */
  key?: SwitchKey
  children?: MenuNode[]
}

/**
 * Workspaces, as the menu shows them: every app they can get into, and under an
 * app split into areas, the areas open to them. Built from the same helpers as
 * the home launcher, so the two never offer different doors.
 */
function workspacesFor(role: Role | null, permissions: Permission[]): MenuNode[] {
  return openableModules(role, permissions).map((app) => ({
    name: app.name,
    icon: app.icon,
    href: app.href,
    key: app.areas ? undefined : app.key,
    children: app.areas
      ? openableAreas(app, role, permissions).map((area) => ({
          name: area.name,
          icon: area.icon,
          href: area.href,
          // An area with no sidebar of its own opens the app's, so it is ticked for it.
          key: area.href ? (area.area ?? app.key) : undefined,
        }))
      : undefined,
  }))
}

const row = "flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-left text-sm"
const enabled = "text-neutral-800 hover:bg-neutral-100"
const panel = "z-50 rounded-xl border border-black/10 bg-white p-1 shadow-lg"

/** Width to fall back on before the header has been measured. */
const PANEL_WIDTH = 256
/** Between a row and the panel it opens, so the two read as separate cards. */
const GAP = 10
/** Between a panel and the edge of the screen. */
const MARGIN = 8
/**
 * How long a panel stays up after the pointer leaves. Crossing to a panel means
 * cutting a corner off the row, and without this the menu shuts under the
 * pointer on the way there.
 */
const CLOSE_DELAY = 260

function RowIcon({ icon: Icon, dim }: { icon: LucideIcon; dim?: boolean }) {
  return (
    <Icon
      className={cn("size-4 shrink-0", dim ? "text-neutral-400" : "text-neutral-500")}
      strokeWidth={1.75}
    />
  )
}

/** Does this line, or anything under it, lead to the sidebar you are looking at? */
function holdsCurrent(node: MenuNode, current: SwitchKey): boolean {
  if (node.key === current) return true
  return (node.children ?? []).some((child) => holdsCurrent(child, current))
}

/**
 * Where a submenu sits: beside the row that opened it, and when the screen runs
 * out to the right, slid back over the panel it came from rather than off the
 * edge. Measured against the viewport, so a panel two levels deep behaves the
 * same as the first one.
 */
function useFlyoutPlacement(
  open: boolean,
  anchor: RefObject<HTMLDivElement | null>,
  panelWidth: number,
) {
  // Corrected before the first paint, so the placeholder is never seen.
  const [box, setBox] = useState({ left: 0, width: panelWidth })

  useLayoutEffect(() => {
    const node = anchor.current
    if (!open || !node) return

    function place() {
      const rect = node!.getBoundingClientRect()
      const width = Math.min(panelWidth, window.innerWidth - MARGIN * 2)
      const left = Math.max(MARGIN, Math.min(rect.right + GAP, window.innerWidth - width - MARGIN))
      // The panel is positioned against the row, so the viewport figure has to
      // come back to an offset from it.
      setBox({ left: left - rect.left, width })
    }

    place()
    window.addEventListener("resize", place)
    return () => window.removeEventListener("resize", place)
  }, [open, anchor, panelWidth])

  return box
}

/**
 * Keeps a panel up while the pointer is on its way to it. Leaving only starts a
 * countdown, which coming back anywhere over the row, the gap or the panel
 * itself calls off.
 */
function useHoverIntent(setOpen: (open: boolean) => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }, [])

  // A panel that unmounts mid-countdown must not set state afterwards.
  useEffect(() => cancel, [cancel])

  return {
    openNow: useCallback(() => {
      cancel()
      setOpen(true)
    }, [cancel, setOpen]),
    closeSoon: useCallback(() => {
      cancel()
      timer.current = setTimeout(() => setOpen(false), CLOSE_DELAY)
    }, [cancel, setOpen]),
    cancelClose: cancel,
  }
}

/** One workspace line: a link, or a row that opens a panel of its own beside it. */
function MenuBranch({
  node,
  current,
  onNavigate,
  panelWidth,
}: {
  node: MenuNode
  current: SwitchKey
  onNavigate: () => void
  /** What every panel in this menu measures, taken from the header. */
  panelWidth: number
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const placement = useFlyoutPlacement(open, wrapRef, panelWidth)
  const { openNow, closeSoon, cancelClose } = useHoverIntent(setOpen)
  const isCurrent = node.key === current

  if (!node.children?.length) {
    if (!node.href) {
      return (
        <div role="menuitem" aria-disabled className={cn(row, "cursor-default text-neutral-400")}>
          <RowIcon icon={node.icon} dim />
          <span className="flex-1 truncate">{node.name}</span>
          <span className="shrink-0 rounded-full border border-black/8 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
            Soon
          </span>
        </div>
      )
    }

    return (
      <Link
        href={node.href}
        role="menuitem"
        aria-current={isCurrent ? "page" : undefined}
        onClick={onNavigate}
        className={cn(row, enabled)}
      >
        <RowIcon icon={node.icon} />
        <span className={cn("flex-1 truncate", isCurrent && "font-medium")}>{node.name}</span>
        {isCurrent ? <Check className="size-4 shrink-0 text-neutral-900" strokeWidth={2} /> : null}
      </Link>
    )
  }

  return (
    <div
      ref={wrapRef}
      className="relative"
      // A mouse opens the panel by moving onto the row; a tap has to press it,
      // or the panel would open and close on the same touch.
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") openNow()
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") closeSoon()
      }}
      // Tabbing into the panel keeps it up; tabbing past it puts it away.
      onFocus={() => setOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          cancelClose()
          setOpen((value) => !value)
        }}
        className={cn(row, enabled, open && "bg-neutral-100")}
      >
        <RowIcon icon={node.icon} />
        <span className={cn("flex-1 truncate", holdsCurrent(node, current) && "font-medium")}>
          {node.name}
        </span>
        <ChevronRight className="size-4 shrink-0 text-neutral-400" strokeWidth={2} />
      </button>

      {open ? (
        // The gap is carried as transparent padding rather than empty space, so
        // the pointer is still inside this branch while it crosses it.
        <div
          className="absolute top-0"
          style={{ left: placement.left - GAP, width: placement.width + GAP, paddingLeft: GAP }}
        >
          <div role="menu" className={panel}>
            {node.children.map((child) => (
              <MenuBranch
                key={child.name}
                node={child}
                current={current}
                onNavigate={onNavigate}
                panelWidth={panelWidth}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SignOutItem() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className={cn(row, enabled, "disabled:cursor-default disabled:opacity-40")}
    >
      <RowIcon icon={LogOut} />
      Logout
    </button>
  )
}

/** Sidebar header: names the app you are in and drops down to switch to another. */
export function ModuleSwitcher({
  current,
  role,
  permissions,
  signOut,
}: {
  current: SwitchKey
  role: Role | null
  permissions: Permission[]
  signOut: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [refreshing, startRefresh] = useTransition()
  const currentName = SWITCH_TARGETS.find((entry) => entry.key === current)?.name
  const workspaces = workspacesFor(role, permissions)
  // The first panel hangs off the header and so is its width; the ones beside
  // it are given the same figure, so the menu is one column wide throughout.
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH)

  useLayoutEffect(() => {
    const node = rootRef.current
    if (!open || !node) return

    function measure() {
      setPanelWidth(node!.offsetWidth)
    }

    measure()
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [open])

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
    <div ref={rootRef} className="relative min-w-0 flex-1">
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
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">
          IP
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-neutral-900">Indah Puri</span>
          <span className="block truncate text-xs text-neutral-500">{currentName}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-neutral-400" strokeWidth={2} />
      </button>

      {open ? (
        <div role="menu" className={cn("absolute inset-x-0 top-full mt-1", panel)}>
          <Link
            href="/"
            role="menuitem"
            onClick={() => setOpen(false)}
            className={cn(row, enabled)}
          >
            <RowIcon icon={House} />
            Home
          </Link>

          <MenuBranch
            node={{
              name: "Workspaces",
              icon: LayoutGrid,
              href: null,
              children: workspaces,
            }}
            current={current}
            onNavigate={() => setOpen(false)}
            panelWidth={panelWidth}
          />

          <div className="mx-1 my-1 border-t border-black/8" />

          <button
            type="button"
            role="menuitem"
            aria-busy={refreshing}
            disabled={refreshing}
            onClick={() =>
              startRefresh(() => {
                router.refresh()
                setOpen(false)
              })
            }
            className={cn(row, enabled, "disabled:cursor-default disabled:opacity-60")}
          >
            <RefreshCw
              className={cn("size-4 shrink-0 text-neutral-500", refreshing && "animate-spin")}
              strokeWidth={1.75}
            />
            Refresh
          </button>

          <form action={signOut}>
            <SignOutItem />
          </form>
        </div>
      ) : null}
    </div>
  )
}

import Image from "next/image"

import { ModuleTile } from "@/components/layout/module-tile"
import { openableModules } from "@/components/layout/nav-config"
import { signOut } from "@/features/auth/actions"
import { requireUser } from "@/features/auth/session"

/** App launcher: every module they can get into, one tile each. */
export default async function HomePage() {
  const { name, role, permissions } = await requireUser()
  // An app whose every page is closed to them is not offered at all, rather
  // than shown as a tile that turns them away.
  const modules = openableModules(role, permissions)

  return (
    <main className="flex h-full flex-col overflow-y-auto bg-neutral-50">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-black/8 bg-white px-4 sm:px-6">
        <span className="flex items-center gap-2.5 text-sm font-semibold tracking-tight text-neutral-900">
          <Image
            src="/logo.png"
            alt="Indah Puri Golf Resort"
            width={363}
            height={158}
            className="h-10 w-auto rounded-md border border-black/8"
          />
          Indah Puri Apps
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            Sign out
          </button>
        </form>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
          Welcome, {name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {modules.length === 0
            ? "You have not been given access to any app yet. Ask a manager to set your permissions."
            : "Choose an app to open."}
        </p>

        <ul className="mt-10 grid grid-cols-3 justify-items-center gap-x-4 gap-y-8 sm:grid-cols-4 md:grid-cols-6">
          {modules.map((module) => (
            <li key={module.name}>
              <ModuleTile moduleKey={module.key} role={role} permissions={permissions} />
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

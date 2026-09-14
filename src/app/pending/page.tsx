import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { signOut } from "@/features/auth/actions"
import { getUser } from "@/features/auth/session"

export const metadata: Metadata = {
  title: "Waiting for access",
}

/** Where someone lands after signing up, until a manager gives them a role. */
export default async function PendingPage() {
  const user = await getUser()
  if (!user) redirect("/login")
  if (user.role) redirect("/dashboard")

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border border-black/15 bg-white p-6 sm:p-8">
        <h1 className="text-xl font-semibold tracking-tight text-black">Waiting for access</h1>
        <p className="mt-2 text-sm text-black/60">
          You are signed in as <span className="font-medium text-black">{user.email}</span>, but a
          manager has not given you a role yet. Ask them to let you in, then reload this page.
        </p>

        <form action={signOut} className="mt-6">
          <button
            type="submit"
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-black/20 px-4 text-sm font-medium text-black transition-colors hover:border-black"
          >
            Sign out
          </button>
        </form>
      </div>
    </main>
  )
}

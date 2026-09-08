import Link from "next/link"

import { getUser } from "@/features/auth/session"

export default async function HomePage() {
  const user = await getUser()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-black">
          Finance Apps
        </h1>
        <p className="mt-2 text-sm text-black/60">
          {user ? `Signed in as ${user.email}.` : "Sign in to continue."}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href={user ? "/dashboard" : "/login"}
            className="inline-flex h-10 items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white transition-opacity hover:opacity-80"
          >
            {user ? "Open Dashboard" : "Sign in"}
          </Link>
          {user ? null : (
            <Link
              href="/signup"
              className="inline-flex h-10 items-center justify-center rounded-md border border-black/20 px-4 text-sm font-medium text-black transition-colors hover:border-black"
            >
              Create account
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}

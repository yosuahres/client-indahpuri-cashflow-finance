import type { ReactNode } from "react"

/** Centered shell shared by every auth screen. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-4 py-12">
      {children}
    </main>
  )
}

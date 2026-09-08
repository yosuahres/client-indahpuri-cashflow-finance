import Link from "next/link"
import type { ReactNode } from "react"

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer: { prompt: string; href: string; label: string }
}) {
  return (
    <div className="w-full max-w-sm">
      <div className="rounded-xl border border-black/15 bg-white p-8">
        <h1 className="text-xl font-semibold tracking-tight text-black">
          {title}
        </h1>
        <p className="mt-1 text-sm text-black/60">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-6 text-center text-sm text-black/60">
        {footer.prompt}{" "}
        <Link
          href={footer.href}
          className="font-medium text-black underline underline-offset-4 hover:opacity-70"
        >
          {footer.label}
        </Link>
      </p>
    </div>
  )
}

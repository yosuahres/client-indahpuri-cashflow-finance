import Link from "next/link"
import type { ReactNode } from "react"
import { GalleryVerticalEnd } from "lucide-react"

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
    <div className="w-full max-w-md">
      <div className="mb-6 flex items-center justify-center gap-3">
        <span className="grid size-9 place-items-center rounded-lg bg-neutral-900 text-white">
          <GalleryVerticalEnd className="size-5" strokeWidth={1.75} />
        </span>
        <span className="text-xl font-medium text-neutral-900">Indah Puri CashFlow</span>
      </div>

      <div className="rounded-2xl border border-black/8 bg-white px-6 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-1.5 text-sm text-neutral-500 sm:text-base">{subtitle}</p>
        </div>
        <div className="mt-8">{children}</div>
      </div>

      <p className="mt-6 text-center text-sm text-neutral-500">
        {footer.prompt}{" "}
        <Link
          href={footer.href}
          className="font-medium text-neutral-900 underline underline-offset-4 hover:opacity-70"
        >
          {footer.label}
        </Link>
      </p>
    </div>
  )
}

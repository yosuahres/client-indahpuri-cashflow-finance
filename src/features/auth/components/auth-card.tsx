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
    <div className="w-full max-w-sm">
      <div className="mb-5 flex items-center justify-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-neutral-900 text-white">
          <GalleryVerticalEnd className="size-4.5" strokeWidth={1.75} />
        </span>
        <span className="text-base font-medium text-neutral-900">Indah Puri CashFlow</span>
      </div>

      <div className="rounded-2xl border border-black/8 bg-white px-6 py-7 shadow-sm">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-neutral-900">{title}</h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <div className="mt-6">{children}</div>
      </div>

      <p className="mt-5 text-center text-sm text-neutral-500">
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

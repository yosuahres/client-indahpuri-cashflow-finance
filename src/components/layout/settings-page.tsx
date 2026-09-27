import type { ReactNode } from "react"

import { TABLE_FRAME } from "@/components/table/styles"

/**
 * The column every Settings page sits in, the Account page's width and
 * heading. Lists draw their own boxed table; `card` boxes anything else.
 */
export function SettingsPage({
  title,
  description,
  card = false,
  children,
}: {
  title?: string
  description?: string
  card?: boolean
  children: ReactNode
}) {
  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
        {title ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-sm text-neutral-500 sm:text-base">{description}</p>
            ) : null}
          </>
        ) : null}

        {card ? (
          <div className={title ? "mt-8" : undefined}>
            <div className={TABLE_FRAME}>
              {children}
            </div>
          </div>
        ) : (
          <div className={title ? "mt-8" : undefined}>{children}</div>
        )}
      </div>
    </main>
  )
}

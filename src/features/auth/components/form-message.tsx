import { CircleAlert } from "lucide-react"

export function FormError({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
    >
      <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function FormNotice({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="rounded-md border border-black/20 px-3 py-2 text-sm text-black"
    >
      {children}
    </p>
  )
}

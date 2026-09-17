import type { ComponentProps } from "react"

import { cn } from "@/lib/cn"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-lg border border-black/15 bg-white px-3.5 text-base text-neutral-900 sm:text-sm",
        "placeholder:text-neutral-500",
        "outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900",
        "aria-[invalid=true]:border-rose-600 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-rose-600",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

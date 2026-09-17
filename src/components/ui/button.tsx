import type { ComponentProps } from "react"

import { cn } from "@/lib/cn"

export function Button({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white sm:text-base",
        "transition-opacity hover:opacity-80",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  )
}

import type { ComponentProps } from "react"

import { cn } from "@/lib/cn"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-black/20 bg-white px-3 text-sm text-black",
        "placeholder:text-black/35",
        "outline-none focus:border-black focus:ring-1 focus:ring-black",
        "aria-[invalid=true]:border-black aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-black",
        "disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

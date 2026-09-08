import type { ComponentProps } from "react"

import { cn } from "@/lib/cn"

export function Button({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "inline-flex h-10 w-full items-center justify-center rounded-md bg-black px-4 text-sm font-medium text-white",
        "transition-opacity hover:opacity-80",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    />
  )
}

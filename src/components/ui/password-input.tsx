"use client"

import { useState, type ComponentProps } from "react"
import { Eye, EyeOff } from "lucide-react"

import { Input } from "./input"

/** A password field with a show/hide toggle at its trailing edge. */
export function PasswordInput(props: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOff : Eye

  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-11" />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-lg text-neutral-500 hover:text-neutral-900"
      >
        <Icon className="size-4.5" strokeWidth={1.75} />
      </button>
    </div>
  )
}

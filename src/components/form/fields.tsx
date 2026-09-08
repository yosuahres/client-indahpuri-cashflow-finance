import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/cn"

const controlBase =
  "h-10 w-full rounded-md bg-neutral-100 px-3 text-sm text-neutral-900 placeholder:text-neutral-400 " +
  "focus:outline-2 focus:outline-offset-0 focus:outline-neutral-800 " +
  "aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-rose-500 disabled:opacity-50"

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm text-neutral-600">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-rose-500">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint && !error ? (
        <p className="text-xs text-neutral-500">{hint}</p>
      ) : null}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-rose-600">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlBase, className)} {...props} />
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlBase, "h-auto py-2.5 leading-relaxed", className)}
      {...props}
    />
  )
}

/**
 * Amount field that groups thousands as you type — rupiah figures run to nine
 * digits and are easy to mistype unseparated. The visible input carries the
 * formatted text; a hidden input submits the raw digits.
 *
 * Integer-only: the sen subunit is long out of circulation.
 */
export function MoneyInput({
  id,
  name,
  value,
  onValueChange,
  invalid,
  placeholder = "0",
  disabled,
}: {
  id: string
  name: string
  /** Raw digits, e.g. "240000000". */
  value: string
  onValueChange: (raw: string) => void
  invalid?: boolean
  placeholder?: string
  disabled?: boolean
}) {
  const display = value === "" ? "" : new Intl.NumberFormat("id-ID").format(Number(value))

  return (
    <div className="relative">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-neutral-500"
      >
        Rp
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => onValueChange(event.target.value.replace(/\D/g, ""))}
        className={cn(controlBase, "pl-9 text-right tabular-nums")}
      />
      <input type="hidden" name={name} value={value} />
    </div>
  )
}

export function CheckboxField({
  label,
  hint,
  className,
  ...props
}: ComponentProps<"input"> & { label: string; hint?: string }) {
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label className="flex items-center gap-2.5 text-sm text-neutral-800">
        <input
          type="checkbox"
          className="size-4 shrink-0 rounded-sm accent-neutral-900"
          {...props}
        />
        {label}
      </label>
      {hint ? <p className="pl-[26px] text-xs text-neutral-500">{hint}</p> : null}
    </div>
  )
}

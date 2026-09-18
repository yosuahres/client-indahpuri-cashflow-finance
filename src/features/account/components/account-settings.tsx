"use client"

import { useActionState, useState, useTransition, type ReactNode } from "react"
import { Check, Copy, Pencil, Trash2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { toast, useActionToast } from "@/components/ui/toast"
import { cn } from "@/lib/cn"
import type { FormState } from "@/lib/form-state"

import { changePassword, deleteMyAccount, updateName } from "../actions"

const initialState: FormState = {}

const primaryButton =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white " +
  "hover:opacity-85 disabled:cursor-default disabled:opacity-40"

const outlineButton =
  "inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-black/10 px-3 text-sm font-medium text-neutral-800 " +
  "hover:border-black/20 disabled:cursor-not-allowed disabled:opacity-50"

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/** Label and explanation on the left, the control on the right; stacked on a phone. */
function Row({
  label,
  htmlFor,
  description,
  children,
}: {
  label: string
  htmlFor?: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-3 border-t border-black/8 py-5 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-8">
      <div>
        <label htmlFor={htmlFor} className="text-sm font-medium text-neutral-900">
          {label}
        </label>
        <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function NameForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(updateName, initialState)
  const [value, setValue] = useState(name)
  useActionToast(state)
  const error = state.fieldErrors?.name

  return (
    <form action={formAction} noValidate>
      <Row label="Full name" htmlFor="name" description="Your name as it appears across the app.">
        <div className="flex gap-3">
          <Input
            id="name"
            name="name"
            autoComplete="name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "name-error" : undefined}
          />
          <button
            type="submit"
            disabled={pending || value.trim() === name || !value.trim()}
            className={primaryButton}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
        {error ? (
          <p id="name-error" className="mt-1.5 text-xs text-rose-600">
            {error}
          </p>
        ) : null}
      </Row>
    </form>
  )
}

function CopyField({ id, value }: { id: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error("Could not copy. Select the text and copy it instead.")
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input id={id} value={value} readOnly className="text-neutral-500" />
      <button
        type="button"
        onClick={copy}
        aria-label="Copy user ID"
        title={copied ? "Copied" : "Copy"}
        className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      >
        {copied ? (
          <Check className="size-4" strokeWidth={2} />
        ) : (
          <Copy className="size-4" strokeWidth={1.75} />
        )}
      </button>
    </div>
  )
}

function PasswordSection() {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState(
    async (previous: FormState, formData: FormData) => {
      const next = await changePassword(previous, formData)
      if (next.message) setOpen(false)
      return next
    },
    initialState,
  )
  useActionToast(state)
  const errors = open ? (state.fieldErrors ?? {}) : {}

  const fields = [
    { name: "currentPassword", label: "Current password", autoComplete: "current-password" },
    { name: "newPassword", label: "New password", autoComplete: "new-password" },
    { name: "confirmPassword", label: "Confirm new password", autoComplete: "new-password" },
  ] as const

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-neutral-900">Change your password</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            You can change the password you sign in with.
          </p>
        </div>
        {open ? null : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="cursor-pointer rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          >
            Change password
          </button>
        )}
      </div>

      {open ? (
        <form action={formAction} noValidate className="mt-5 grid max-w-md gap-4">
          {fields.map((field) => (
            <div key={field.name} className="flex flex-col gap-2">
              <label htmlFor={field.name} className="text-sm font-medium text-neutral-900">
                {field.label}
              </label>
              <PasswordInput
                id={field.name}
                name={field.name}
                autoComplete={field.autoComplete}
                aria-invalid={Boolean(errors[field.name])}
                aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}
              />
              {errors[field.name] ? (
                <p id={`${field.name}-error`} className="text-xs text-rose-600">
                  {errors[field.name]}
                </p>
              ) : null}
            </div>
          ))}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? "Changing…" : "Change password"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-10 cursor-pointer rounded-lg px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}

function DeleteSection() {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  function remove() {
    startTransition(async () => {
      // Only returns when it failed; success redirects to the login page.
      const result = await deleteMyAccount()
      toast.error(result.error)
      setConfirming(false)
    })
  }

  return (
    <section className="mt-10 flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-xl">
        <h2 className="text-base font-semibold text-neutral-900">Delete account</h2>
        <p className="mt-0.5 text-sm text-neutral-500">
          This removes your login for good and cannot be undone. Records you entered stay on the
          books.
        </p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="h-10 cursor-pointer rounded-lg px-4 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="h-10 cursor-pointer rounded-lg bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-50"
          >
            {pending ? "Deleting…" : "Yes, delete my account"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="h-10 cursor-pointer rounded-lg bg-rose-600 px-4 text-sm font-medium text-white hover:bg-rose-500"
        >
          Delete my account
        </button>
      )}
    </section>
  )
}

export function AccountSettings({
  user,
}: {
  user: { id: string; name: string; email: string }
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-8 sm:py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">Account</h1>
      <p className="mt-1 text-sm text-neutral-500 sm:text-base">
        Manage your personal details and account settings.
      </p>

      <div className="mt-8 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-neutral-100 text-lg font-semibold text-neutral-900">
          {initials(user.name)}
        </span>
        <div>
          <div className="flex flex-wrap gap-2">
            {/* Uploads are not built yet; the controls show where they will be. */}
            <button type="button" disabled className={outlineButton}>
              <Pencil className="size-4" strokeWidth={1.75} />
              Change picture
            </button>
            <button
              type="button"
              disabled
              className={cn(outlineButton, "border-rose-200 text-rose-600")}
            >
              <Trash2 className="size-4" strokeWidth={1.75} />
              Remove picture
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">Picture uploads are coming soon.</p>
        </div>
      </div>

      <div className="mt-8">
        <NameForm name={user.name} />
        <Row label="Email address" htmlFor="email" description="The email you sign in with.">
          <Input id="email" value={user.email} readOnly className="text-neutral-500" />
        </Row>
        <Row label="User ID" htmlFor="user-id" description="Your unique user identifier.">
          <CopyField id="user-id" value={user.id} />
        </Row>
      </div>

      <PasswordSection />
      <DeleteSection />
    </div>
  )
}

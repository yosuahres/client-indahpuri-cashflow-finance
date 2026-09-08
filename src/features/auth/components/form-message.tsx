export function FormError({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="rounded-md border border-black bg-black px-3 py-2 text-sm text-white"
    >
      {children}
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

export type FormState = {
  /** Error covering the whole form (save failed, provider down). */
  error?: string
  /** Keyed by field name. */
  fieldErrors?: Record<string, string>
  /** Success notice shown when the form stays open after saving. */
  message?: string
  /** Changes on every save so the form knows a *new* one landed. */
  savedAt?: number
}

export function hasFieldErrors(errors: Record<string, string>) {
  return Object.keys(errors).length > 0
}

export type AuthFieldErrors = {
  email?: string
  password?: string
}

export type AuthFormState = {
  /** Error that applies to the whole form (bad credentials, provider down). */
  error?: string
  /** Per-field validation errors. */
  fieldErrors?: AuthFieldErrors
  /** Success notice shown in place of the form, e.g. "check your inbox". */
  message?: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateLogin(email: string, password: string): AuthFieldErrors {
  const errors: AuthFieldErrors = {}
  if (!email) errors.email = "Email is required."
  else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address."
  if (!password) errors.password = "Password is required."
  return errors
}

export function hasErrors(errors: AuthFieldErrors) {
  return Object.keys(errors).length > 0
}

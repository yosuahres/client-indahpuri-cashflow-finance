import type { Metadata } from "next"

import { AuthCard } from "@/features/auth/components/auth-card"
import { FormError } from "@/features/auth/components/form-message"
import { LoginForm } from "@/features/auth/components/login-form"
import { safeRedirectPath } from "@/lib/site-url"

export const metadata: Metadata = {
  title: "Sign in",
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const next = safeRedirectPath(
    typeof params.next === "string" ? params.next : undefined,
  )
  // Surfaced by /auth/callback and /auth/confirm when a link fails.
  const linkError = typeof params.error === "string" ? params.error : undefined

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to your account to continue"
    >
      {linkError ? (
        <div className="mb-4">
          <FormError>{linkError}</FormError>
        </div>
      ) : null}
      <LoginForm next={next} />
    </AuthCard>
  )
}

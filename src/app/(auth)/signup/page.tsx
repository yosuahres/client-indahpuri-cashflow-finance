import type { Metadata } from "next"

import { AuthCard } from "@/features/auth/components/auth-card"
import { SignupForm } from "@/features/auth/components/signup-form"

export const metadata: Metadata = {
  title: "Create account",
}

export default function SignupPage() {
  return (
    <AuthCard
      title="Create account"
      subtitle="Start tracking your finances in a minute."
      footer={{
        prompt: "Already have an account?",
        href: "/login",
        label: "Sign in",
      }}
    >
      <SignupForm />
    </AuthCard>
  )
}

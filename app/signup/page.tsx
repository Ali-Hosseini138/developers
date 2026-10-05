import { AuthForm } from '@/components/auth-form'

export default function SignupPage() {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <AuthForm mode="signup" />
    </main>
  )
}

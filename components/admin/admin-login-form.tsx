'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { loginAction } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full gap-2">
      {pending && <Loader2 className="size-4 animate-spin" />}
      ورود
    </Button>
  )
}

export function AdminLoginForm() {
  const [state, formAction] = useActionState(loginAction, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-card-foreground">
          رمز عبور مدیر
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          dir="ltr"
          autoComplete="current-password"
          placeholder="••••••••"
          className="h-11 rounded-lg border border-input bg-background px-3 text-start text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </div>
      {state?.error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  )
}

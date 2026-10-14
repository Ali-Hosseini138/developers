'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { loginAction } from '@/app/admin/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
      <div>
        <Label htmlFor="username">نام کاربری مدیر</Label>
        <Input
          id="username"
          name="username"
          type="text"
          required
          dir="ltr"
          autoComplete="username"
          className="mt-1.5 text-left"
        />
      </div>

      <div>
        <Label htmlFor="password">گذرواژه</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          dir="ltr"
          autoComplete="current-password"
          className="mt-1.5 text-left"
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

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMessage('')
    if (password.length < 8) {
      setErrorMessage('رمز جدید باید حداقل ۸ کاراکتر باشد.')
      return
    }
    if (password !== confirm) {
      setErrorMessage('تکرار رمز عبور با رمز جدید یکسان نیست.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      router.replace('/dashboard')
    } catch {
      setErrorMessage('تغییر رمز انجام نشد. لینک بازیابی ممکن است منقضی شده باشد؛ دوباره درخواست بازیابی بدهید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12 sm:px-6">
      <form onSubmit={submit} className="w-full rounded-2xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold">تعیین رمز جدید</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">رمز جدید حساب توسعه‌دهنده را وارد کنید.</p>

        <div className="mt-6">
          <Label htmlFor="new-password">رمز جدید</Label>
          <div className="relative mt-1.5">
            <Input
              id="new-password"
              type={showPassword ? 'text' : 'password'}
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              className="pe-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground"
              aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <Label htmlFor="confirm-password">تکرار رمز جدید</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            dir="ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
            className="mt-1.5"
          />
        </div>

        {errorMessage && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

        <Button type="submit" disabled={loading} className="mt-6 w-full gap-2">
          {loading && <Loader2 className="size-4 animate-spin" />}
          ذخیره رمز جدید
        </Button>
      </form>
    </main>
  )
}
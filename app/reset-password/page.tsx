'use client'

import { Suspense, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ticketError } from '@/lib/support-tickets'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const resetInFlight = useRef(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [success, setSuccess] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || success || resetInFlight.current) return
    setErrorMessage('')
    if (!token) return setErrorMessage('لینک بازیابی معتبر نیست یا token در آدرس وجود ندارد.')
    if (password.length < 8) return setErrorMessage('رمز جدید باید حداقل ۸ کاراکتر باشد.')
    if (password !== confirm) return setErrorMessage('تکرار رمز عبور با رمز جدید یکسان نیست.')

    resetInFlight.current = true
    setLoading(true)
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) { setErrorMessage(ticketError(payload, 'تغییر رمز انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید.')); return }
      setPassword('')
      setConfirm('')
      setSuccess(true)
      window.setTimeout(() => router.replace('/login?password_reset=1'), 1800)
    } catch {
      setErrorMessage('ارتباط با سرویس تغییر رمز برقرار نشد. دوباره تلاش کنید.')
    } finally {
      resetInFlight.current = false
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12 sm:px-6">
      {success ? (
        <div className="w-full rounded-2xl border border-primary/20 bg-card p-6 text-center">
          <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="size-7" />
          </span>
          <h1 className="mt-4 text-2xl font-bold">گذرواژه با موفقیت تغییر کرد</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            رمز جدید شما ثبت شد. تا چند لحظه دیگر به صفحه ورود منتقل می‌شوید.
          </p>
          <Button type="button" onClick={() => router.replace('/login?password_reset=1')} className="mt-6 w-full">
            رفتن به صفحه ورود
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="w-full rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-bold">تعیین رمز جدید</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">رمز جدید حساب توسعه‌دهنده را وارد کنید.</p>
          <div className="mt-6"><Label htmlFor="new-password">رمز جدید</Label><div className="relative mt-1.5"><Input id="new-password" type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required className="pe-10" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground" aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div></div>
          <div className="mt-4"><Label htmlFor="confirm-password">تکرار رمز جدید</Label><Input id="confirm-password" type={showPassword ? 'text' : 'password'} dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required className="mt-1.5" /></div>
          {errorMessage && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
          <Button type="submit" disabled={loading || !token} className="mt-6 w-full gap-2">{loading && <Loader2 className="size-4 animate-spin" />}ذخیره رمز جدید</Button>
        </form>
      )}
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">در حال بارگذاری...</div>}><ResetPasswordForm /></Suspense>
}


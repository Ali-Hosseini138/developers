'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const recoveryInFlight = useRef(false)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || recoveryInFlight.current) return
    recoveryInFlight.current = true
    setLoading(true)
    setErrorMessage('')
    try {
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload?.detail || 'reset_failed')
      setSent(true)
    } catch {
      setErrorMessage('ارسال لینک بازیابی انجام نشد. ایمیل را بررسی کنید و دوباره تلاش کنید.')
    } finally {
      recoveryInFlight.current = false
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-[65vh] max-w-md items-center px-4 py-12 sm:px-6">
      <div className="w-full">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="size-4" />
          بازگشت به ورود
        </Link>
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail className="size-5" /></span>
          <h1 className="mt-4 text-2xl font-bold">بازیابی رمز عبور</h1>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">ایمیل حساب توسعه‌دهنده را وارد کنید تا لینک تعیین رمز جدید برای شما ارسال شود.</p>
          {sent ? (
            <div role="status" className="mt-6 rounded-xl bg-primary/5 p-4 text-sm leading-7">اگر این ایمیل در سیستم ثبت شده باشد، لینک بازیابی برای آن ارسال شده است.</div>
          ) : (
            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              <div><Label htmlFor="recovery-email">ایمیل</Label><Input id="recovery-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1.5" required /></div>
              {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
              <Button type="submit" disabled={loading || !email.trim()} className="gap-2">{loading && <Loader2 className="size-4 animate-spin" />}ارسال لینک بازیابی</Button>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}


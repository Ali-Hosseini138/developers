'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/components/store-provider'
import { createClient } from '@/lib/supabase/client'

function AuthFormInner({ mode }: { mode: 'login' | 'signup' }) {
  const { login } = useStore()
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next') || '/dashboard'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard'

  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organization, setOrganization] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const isSignup = mode === 'signup'
  const registered = searchParams.get('registered') === '1'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    const normalizedEmail = email.trim().toLowerCase()
    const displayName =
      [name.trim(), lastName.trim()].filter(Boolean).join(' ') ||
      organization.trim() ||
      normalizedEmail.split('@')[0] ||
      'توسعه‌دهنده'

    try {
      if (isSignup) {
        if (password.length < 8) {
          setErrorMessage('رمز عبور باید حداقل ۸ کاراکتر باشد.')
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: displayName,
              phone: phone.trim(),
              national_id: nationalId.trim(),
              organization: organization.trim() || null,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        })

        if (error) {
          const message = error.message.toLowerCase()
          setErrorMessage(
            message.includes('rate')
              ? 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.'
              : message.includes('already') || message.includes('registered')
                ? 'این ایمیل قبلاً ثبت شده است. وارد شوید یا بازیابی رمز عبور را استفاده کنید.'
                : 'ثبت‌نام انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید.',
          )
          return
        }

        if (!data.session) {
          setSuccessMessage('ثبت‌نام انجام شد. برای فعال‌سازی حساب، ایمیل خود را تأیید کنید.')
          return
        }

        if (data.user) {
          login({
            id: data.user.id,
            name: displayName,
            email: data.user.email || normalizedEmail,
            phone: phone.trim(),
            nationalId: nationalId.trim(),
            organization: organization.trim(),
          })
        }

        router.push(next)
        return
      }

      const result = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (result.error) {
        const message = result.error.message.toLowerCase()
        setErrorMessage(
          message.includes('rate')
            ? 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.'
            : 'ایمیل یا رمز عبور نادرست است.',
        )
        return
      }

      if (result.data.user) {
        const metadata = result.data.user.user_metadata || {}
        login({
          id: result.data.user.id,
          name: metadata.full_name || normalizedEmail.split('@')[0] || 'توسعه‌دهنده',
          email: result.data.user.email || normalizedEmail,
          phone: metadata.phone,
          nationalId: metadata.national_id,
          organization: metadata.organization,
        })
      }

      router.push(next)
    } catch {
      setErrorMessage('ارتباط با سرویس احراز هویت برقرار نشد. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="flex flex-col items-center text-center">
        <img src="https://netstore.app/logo/netstore-logo-blue.svg" alt="لوگوی نت‌استور" className="h-12 w-auto" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {isSignup ? 'ساخت حساب توسعه‌دهنده' : 'ورود به نت‌استور'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? 'ثبت‌نام کن و اولین اپلیکیشنت را منتشر کن' : 'برای انتشار و مدیریت اپ‌ها وارد شو'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
        {isSignup && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor="name">نام</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="نام" required /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="lastName">نام خانوادگی</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="نام خانوادگی" required /></div>
            </div>
            <div className="flex flex-col gap-1.5"><Label htmlFor="organization">نام سازمان یا استودیو <span className="text-muted-foreground">(اختیاری)</span></Label><Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="مثلاً: استودیو نبض" /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5"><Label htmlFor="phone">شماره تلفن</Label><Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="۰۹۱۲۱۲۳۴۵۶۷" dir="ltr" required /></div>
              <div className="flex flex-col gap-1.5"><Label htmlFor="nationalId">کد ملی</Label><Input id="nationalId" value={nationalId} onChange={(e) => setNationalId(e.target.value)} placeholder="کد ملی" dir="ltr" required minLength={10} /></div>
            </div>
          </>
        )}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">ایمیل</Label>
          <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="text-start" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">رمز عبور</Label>
          <div className="relative">
            <Input id="password" type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={8} className="pe-10 text-start" required />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
              className="absolute end-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {registered && !isSignup && <p role="status" className="rounded-lg bg-accent/20 px-3 py-2 text-sm text-accent-foreground">ثبت‌نام انجام شد. اگر تأیید ایمیل فعال است، ابتدا ایمیل خود را تأیید کنید.</p>}
        {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
        {successMessage && (
          <div role="status" className="rounded-lg bg-accent/20 px-3 py-3 text-sm text-accent-foreground">
            <p>{successMessage}</p>
            {isSignup && <Link href="/login" className="mt-2 inline-block font-semibold text-primary underline-offset-4 hover:underline">بعد از تأیید ایمیل، وارد شوید</Link>}
          </div>
        )}

        <Button type="submit" size="lg" disabled={loading} className="mt-2 gap-2">
          {loading && <Loader2 className="size-4 animate-spin" />}
          {isSignup ? 'ثبت‌نام' : 'ورود'}
        </Button>

        {!isSignup && (
          <div className="flex flex-col gap-3 text-center text-sm">
            <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
              رمز عبور را فراموش کرده‌اید؟
            </Link>
            <p className="text-muted-foreground">
              حساب کاربری ندارید؟{' '}
              <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
                ثبت‌نام
              </Link>
            </p>
          </div>
        )}
      </form>
    </div>
  )
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <AuthFormInner mode={mode} />
    </Suspense>
  )
}

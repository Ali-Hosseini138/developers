'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  UserRound,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/components/store-provider'
import { createClient } from '@/lib/supabase/client'

type AccountType = 'individual' | 'legal'

const signupSteps = ['اطلاعات ورود', 'نوع حساب', 'اطلاعات هویتی', 'شماره موبایل']

function normalizeIranPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`
  if (/^989\d{9}$/.test(digits)) return `+${digits}`
  return ''
}

function AuthFormInner({ mode }: { mode: 'login' | 'signup' }) {
  const { login } = useStore()
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next') || '/dashboard'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/dashboard'

  const [signupStep, setSignupStep] = useState(1)
  const [accountType, setAccountType] = useState<AccountType | null>(null)
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

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = useMemo(() => normalizeIranPhone(phone), [phone])
  const displayName =
    accountType === 'legal'
      ? organization.trim() || [name.trim(), lastName.trim()].filter(Boolean).join(' ')
      : [name.trim(), lastName.trim()].filter(Boolean).join(' ')

  const stepValid = useMemo(() => {
    if (!isSignup) return true
    if (signupStep === 1) {
      return Boolean(normalizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) && password.length >= 8)
    }
    if (signupStep === 2) return Boolean(accountType)
    if (signupStep === 3) {
      if (accountType === 'individual') {
        return Boolean(name.trim() && lastName.trim() && /^\d{10}$/.test(nationalId.trim()))
      }
      return Boolean(organization.trim() && name.trim() && lastName.trim() && /^\d{10,11}$/.test(nationalId.trim()))
    }
    if (signupStep === 4) return Boolean(!phone.trim() || normalizedPhone)
    return false
  }, [isSignup, signupStep, accountType, name, lastName, organization, nationalId, normalizedEmail, password, normalizedPhone])

  function resetMessages() {
    setErrorMessage('')
    setSuccessMessage('')
  }

  function goNext() {
    resetMessages()
    if (!stepValid) {
      setErrorMessage('اطلاعات این مرحله را کامل و صحیح وارد کنید.')
      return
    }
    setSignupStep((current) => Math.min(4, current + 1))
  }

  function goBack() {
    resetMessages()
    setSignupStep((current) => Math.max(1, current - 1))
  }

  async function finishSignup() {
    resetMessages()

    if (phone.trim() && !normalizedPhone) {
      setErrorMessage('شماره موبایل معتبر وارد کنید. نمونه: 09121234567')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          metadata: {
            full_name: displayName,
            phone: phone.trim() || null,
            national_id: nationalId.trim(),
            organization: accountType === 'legal' ? organization.trim() : null,
            account_type: accountType,
            representative_name:
              accountType === 'legal'
                ? [name.trim(), lastName.trim()].filter(Boolean).join(' ')
                : null,
          },
        }),
      })

      const payload = await response.json().catch(() => ({}))

      if (!response.ok) {
        setErrorMessage(
          payload.error === 'already_registered'
            ? 'این ایمیل قبلاً ثبت شده است. وارد حساب شوید یا از بازیابی رمز عبور استفاده کنید.'
            : 'تکمیل ثبت‌نام انجام نشد. اطلاعات را بررسی و دوباره تلاش کنید.',
        )
        return
      }

      const result = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      })

      if (result.error || !result.data.user) {
        setErrorMessage('حساب ساخته شد اما ورود خودکار انجام نشد. از صفحه ورود وارد شوید.')
        return
      }

      const authUser = result.data.user
      login({
        id: authUser.id,
        name: displayName || 'توسعه‌دهنده',
        email: authUser.email || normalizedEmail,
        phone: phone.trim() || undefined,
        nationalId: nationalId.trim(),
        organization: accountType === 'legal' ? organization.trim() : undefined,
      })

      router.push(`/terms?next=${encodeURIComponent(next)}`)
      router.refresh()
    } catch {
      setErrorMessage('ارتباط با سرویس ثبت‌نام برقرار نشد. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    resetMessages()

    try {
      const result = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (result.error) {
        const message = result.error.message.toLowerCase()
        setErrorMessage(
          message.includes('rate')
            ? 'تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.'
            : message.includes('email not confirmed') || message.includes('not confirmed')
              ? 'ایمیل شما هنوز تأیید نشده است. ایمیل تأیید را بررسی کنید یا از بازیابی رمز عبور استفاده کنید.'
              : 'ایمیل یا رمز عبور نادرست است.',
        )
        return
      }

      if (result.data.user) {
        const metadata = result.data.user.user_metadata || {}
        const { data: profile } = await supabase
          .from('profiles')
          .select('terms_accepted_at')
          .eq('id', result.data.user.id)
          .maybeSingle()

        login({
          id: result.data.user.id,
          name: metadata.full_name || normalizedEmail.split('@')[0] || 'توسعه‌دهنده',
          email: result.data.user.email || normalizedEmail,
          phone: metadata.phone,
          nationalId: metadata.national_id,
          organization: metadata.organization,
          termsAcceptedAt: profile?.terms_accepted_at || undefined,
        })

        router.push(
          profile?.terms_accepted_at
            ? next
            : `/terms?next=${encodeURIComponent(next)}`,
        )
        return
      }

      router.push(next)
    } catch {
      setErrorMessage('ارتباط با سرویس احراز هویت برقرار نشد. دوباره تلاش کنید.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={isSignup ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
      <div className="flex flex-col items-center text-center">
        <img src="https://netstore.app/logo/netstore-logo-blue.svg" alt="لوگوی نت‌استور" className="h-12 w-auto" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          {isSignup ? 'ساخت حساب توسعه‌دهنده' : 'ورود به نت‌استور'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isSignup ? 'ثبت‌نام توسعه‌دهندگان نت‌استور' : 'پنل توسعه‌دهندگان'}
        </p>
      </div>

      {isSignup ? (
        <>
          <SignupStepper current={signupStep} />

          <div className="mt-7 rounded-2xl border border-border bg-card p-6 sm:p-8">
            {signupStep === 1 && (
              <div>
                <StepHeader title="اطلاعات ورود" text="ایمیل و رمز عبوری که برای ورود به پنل استفاده می‌کنید." />

                <div className="mt-6">
                  <Label htmlFor="signup-email">ایمیل</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className="mt-1.5 h-11 text-left"
                  />
                </div>

                <div className="mt-5">
                  <Label htmlFor="signup-password">رمز عبور</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      dir="ltr"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="حداقل ۸ کاراکتر"
                      minLength={8}
                      autoComplete="new-password"
                      className="h-11 pl-11 pr-3 text-left"
                    />
                    <PasswordToggle show={showPassword} onToggle={() => setShowPassword((value) => !value)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">رمز عبور باید حداقل ۸ کاراکتر باشد.</p>
                </div>
              </div>
            )}

            {signupStep === 2 && (
              <div>
                <StepHeader title="نوع حساب" text="نوع حساب توسعه‌دهنده خود را مشخص کنید." />
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <AccountTypeCard
                    active={accountType === 'individual'}
                    icon={<UserRound className="size-6" />}
                    title="شخص حقیقی"
                    text="برای توسعه‌دهندگان و ناشران شخصی"
                    onClick={() => setAccountType('individual')}
                  />
                  <AccountTypeCard
                    active={accountType === 'legal'}
                    icon={<Building2 className="size-6" />}
                    title="شخص حقوقی"
                    text="برای شرکت‌ها، سازمان‌ها و استودیوها"
                    onClick={() => setAccountType('legal')}
                  />
                </div>
              </div>
            )}

            {signupStep === 3 && (
              <div>
                <StepHeader
                  title={accountType === 'legal' ? 'اطلاعات شخص حقوقی' : 'اطلاعات شخص حقیقی'}
                  text="اطلاعات هویتی حساب توسعه‌دهنده را وارد کنید."
                />

                {accountType === 'legal' && (
                  <div className="mt-6">
                    <Label htmlFor="organization">نام شرکت یا سازمان</Label>
                    <Input
                      id="organization"
                      value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      placeholder="نام کامل شرکت یا سازمان"
                      className="mt-1.5 h-11"
                      autoComplete="organization"
                    />
                  </div>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">{accountType === 'legal' ? 'نام نماینده' : 'نام'}</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 h-11"
                      autoComplete="given-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">{accountType === 'legal' ? 'نام خانوادگی نماینده' : 'نام خانوادگی'}</Label>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="mt-1.5 h-11"
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <Label htmlFor="nationalId">{accountType === 'legal' ? 'شناسه ملی شرکت' : 'کد ملی'}</Label>
                  <Input
                    id="nationalId"
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                    placeholder={accountType === 'legal' ? 'شناسه ملی شرکت' : '0012345678'}
                    dir="ltr"
                    inputMode="numeric"
                    className="mt-1.5 h-11 text-left"
                    maxLength={accountType === 'legal' ? 11 : 10}
                  />
                </div>
              </div>
            )}

            {signupStep === 4 && (
              <div>
                <StepHeader
                  title="شماره موبایل"
                  text="فعلاً تأیید پیامکی غیرفعال است. می‌توانید شماره موبایل را وارد کنید یا این بخش را خالی بگذارید."
                />

                <div className="mt-6">
                  <Label htmlFor="signup-phone">شماره موبایل <span className="text-muted-foreground">(اختیاری)</span></Label>
                  <Input
                    id="signup-phone"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value)
                      resetMessages()
                    }}
                    placeholder="09121234567"
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    className="mt-1.5 h-11 text-left"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    برای تست پنل نیازی به دریافت کد پیامکی نیست.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && <p role="alert" className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
            {successMessage && <p role="status" className="mt-5 rounded-lg bg-accent/20 px-3 py-2 text-sm text-accent-foreground">{successMessage}</p>}

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
              <Button type="button" variant="ghost" onClick={goBack} disabled={signupStep === 1 || loading} className="gap-2">
                <ArrowRight className="size-4" />
                مرحله قبل
              </Button>

              {signupStep < 4 ? (
                <Button type="button" onClick={goNext} disabled={!stepValid || loading} className="gap-2">
                  مرحله بعد
                  <ArrowLeft className="size-4" />
                </Button>
              ) : (
                <Button type="button" onClick={finishSignup} disabled={!stepValid || loading} className="gap-2">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                  تکمیل ثبت‌نام
                </Button>
              )}
            </div>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            قبلاً ثبت‌نام کرده‌اید؟{' '}
            <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">وارد شوید</Link>
          </p>
        </>
      ) : (
        <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">ایمیل</Label>
            <Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="h-11 text-left" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">رمز عبور</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={8} autoComplete="current-password" className="h-11 pl-11 pr-3 text-left" required />
              <PasswordToggle show={showPassword} onToggle={() => setShowPassword((value) => !value)} />
            </div>
          </div>

          {registered && <p role="status" className="rounded-lg bg-accent/20 px-3 py-2 text-sm text-accent-foreground">ثبت‌نام انجام شد. وارد حساب خود شوید.</p>}
          {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

          <Button type="submit" size="lg" disabled={loading} className="mt-2 gap-2">
            {loading && <Loader2 className="size-4 animate-spin" />}
            ورود
          </Button>

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
        </form>
      )}
    </div>
  )
}

function SignupStepper({ current }: { current: number }) {
  return (
    <div className="mt-8 overflow-x-auto pb-1">
      <div className="relative mx-auto flex min-w-[520px] max-w-xl items-start justify-between px-2">
        <div className="absolute left-[9%] right-[9%] top-4 h-px bg-border" />
        <div
          className="absolute right-[9%] top-4 h-px bg-primary transition-all"
          style={{ width: `${((current - 1) / (signupSteps.length - 1)) * 82}%` }}
        />
        {signupSteps.map((title, index) => {
          const number = index + 1
          const done = number < current
          const active = number === current
          return (
            <div key={title} className="relative z-10 flex w-28 flex-col items-center text-center">
              <span className={`flex size-8 items-center justify-center rounded-full border-2 bg-background text-xs font-bold transition-colors ${
                done
                  ? 'border-primary bg-primary text-primary-foreground'
                  : active
                    ? 'border-primary text-primary'
                    : 'border-border text-muted-foreground'
              }`}>
                {done ? <Check className="size-4" /> : number.toLocaleString('fa-IR')}
              </span>
              <span className={`mt-2 text-xs font-medium ${active ? 'text-foreground' : done ? 'text-primary' : 'text-muted-foreground'}`}>
                {title}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AccountTypeCard({
  active,
  icon,
  title,
  text,
  onClick,
}: {
  active: boolean
  icon: React.ReactNode
  title: string
  text: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-5 text-right transition-all ${
        active
          ? 'border-primary bg-primary/5 ring-2 ring-primary/15'
          : 'border-border hover:border-primary/40 hover:bg-secondary/40'
      }`}
    >
      <span className={`flex size-11 items-center justify-center rounded-xl ${active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
        {icon}
      </span>
      <h2 className="mt-4 font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
    </button>
  )
}

function StepHeader({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="mt-1 text-sm leading-7 text-muted-foreground">{text}</p>
    </div>
  )
}

function PasswordToggle({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={show ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
      className="absolute left-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
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

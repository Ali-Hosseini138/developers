'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Building2, Check, Eye, EyeOff, Loader2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { asciiDigits } from '@/lib/input-normalization'
import { safeInternalPath } from '@/lib/safe-navigation'
import { useStore } from '@/components/store-provider'

type AccountType = 'individual' | 'legal'
const signupSteps = ['اطلاعات ورود', 'نوع حساب', 'اطلاعات هویتی', 'شماره موبایل']

function normalizeIranPhone(value: string) {
  const digits = asciiDigits(value).replace(/\D/g, '')
  if (/^09\d{9}$/.test(digits)) return `+98${digits.slice(1)}`
  if (/^989\d{9}$/.test(digits)) return `+${digits}`
  return ''
}

function extractError(payload: unknown) {
  if (!payload || typeof payload !== 'object') return ''
  const data = payload as Record<string, unknown>
  if (typeof data.detail === 'string') return data.detail
  for (const value of Object.values(data)) {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  }
  return ''
}

function AuthFormInner({ mode }: { mode: 'login' | 'signup' }) {
  const { login } = useStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next') || '/dashboard'
  const next = safeInternalPath(requestedNext)

  const [signupStep, setSignupStep] = useState(1)
  const [accountType, setAccountType] = useState<AccountType | null>(null)
  const [name, setName] = useState('')
  const [lastName, setLastName] = useState('')
  const [organization, setOrganization] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [ceoNationalCard, setCeoNationalCard] = useState<File | null>(null)
  const [ceoNationalCardPreview, setCeoNationalCardPreview] = useState('')
  const [ceoNationalCardError, setCeoNationalCardError] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!ceoNationalCard) { setCeoNationalCardPreview(''); return }
    const preview = URL.createObjectURL(ceoNationalCard)
    setCeoNationalCardPreview(preview)
    return () => URL.revokeObjectURL(preview)
  }, [ceoNationalCard])

  function selectCeoNationalCard(file?: File) {
    if (!file) return
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      setCeoNationalCardError('تصویر PNG یا JPEG غیرخالی با حجم حداکثر ۲ مگابایت انتخاب کنید.')
      return
    }
    setCeoNationalCardError('')
    setCeoNationalCard(file)
  }

  const isSignup = mode === 'signup'
  const registered = searchParams.get('registered') === '1'
  const passwordReset = searchParams.get('password_reset') === '1'
  const verificationResult = searchParams.get('result')

  const normalizedEmail = email.trim().toLowerCase()
  const normalizedPhone = useMemo(() => normalizeIranPhone(phone), [phone])
  const displayName = accountType === 'legal'
    ? organization.trim() || [name.trim(), lastName.trim()].filter(Boolean).join(' ')
    : [name.trim(), lastName.trim()].filter(Boolean).join(' ')

  const stepValid = useMemo(() => {
    if (!isSignup) return true
    if (signupStep === 1) return Boolean(normalizedEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) && password.length >= 8)
    if (signupStep === 2) return Boolean(accountType)
    if (signupStep === 3) {
      if (accountType === 'individual') return Boolean(name.trim() && lastName.trim() && /^\d{10}$/.test(nationalId.trim()))
      return Boolean(organization.trim() && name.trim() && lastName.trim() && /^\d{11}$/.test(nationalId.trim()))
    }
    if (signupStep === 4) return Boolean((!phone.trim() || normalizedPhone) && termsAccepted)
    return false
  }, [isSignup, signupStep, accountType, name, lastName, organization, nationalId, normalizedEmail, password, normalizedPhone, phone, termsAccepted])

  function resetMessages() { setErrorMessage(''); setSuccessMessage('') }
  function goNext() {
    resetMessages()
    if (!stepValid) return setErrorMessage('اطلاعات این مرحله را کامل و صحیح وارد کنید.')
    setSignupStep((current) => Math.min(4, current + 1))
  }
  function goBack() { resetMessages(); setSignupStep((current) => Math.max(1, current - 1)) }

  async function finishSignup() {
    if (loading) return
    resetMessages()
    if (!accountType || !stepValid) return setErrorMessage('اطلاعات ثبت‌نام را کامل کنید.')
    setLoading(true)
    try {
      const registration = {
        accountType,
        email: normalizedEmail,
        password,
        firstName: name.trim(),
        lastName: lastName.trim(),
        identityNumber: nationalId.trim(),
        mobile: normalizedPhone || null,
        companyName: accountType === 'legal' ? organization.trim() : '',
        termsAccepted: true,
      }
      let body: string | FormData = JSON.stringify(registration)
      const hasCard = accountType === 'legal' && ceoNationalCard
      if (hasCard) {
        const form = new FormData()
        for (const [key, value] of Object.entries(registration)) {
          if (value !== null) form.append(key, String(value))
        }
        form.append('identity_document_image', ceoNationalCard!)
        body = form
      }
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        ...(hasCard ? {} : { headers: { 'Content-Type': 'application/json' } }),
        body,
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) return setErrorMessage(extractError(payload) || 'ثبت‌نام انجام نشد. اطلاعات را بررسی کنید.')
      router.push(`/login?registered=1&email=${encodeURIComponent(normalizedEmail)}`)
    } catch {
      setErrorMessage('ارتباط با سرویس ثبت‌نام برقرار نشد. دوباره تلاش کنید.')
    } finally { setLoading(false) }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    resetMessages()
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail, password }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setErrorMessage(response.status === 400
          ? 'ایمیل یا رمز عبور نادرست است، یا ایمیل هنوز تأیید نشده است.'
          : extractError(payload) || 'ورود انجام نشد.')
        return
      }
      login(payload.user)
      window.location.assign(next)
    } catch {
      setErrorMessage('ارتباط با سرویس احراز هویت برقرار نشد. دوباره تلاش کنید.')
    } finally { setLoading(false) }
  }

  async function resendVerification() {
    if (!normalizedEmail || resending) return
    setResending(true)
    resetMessages()
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) setErrorMessage(extractError(payload) || 'ارسال دوباره ایمیل انجام نشد.')
      else setSuccessMessage(extractError(payload) || 'اگر حساب نیاز به تأیید داشته باشد، ایمیل ارسال می‌شود.')
    } catch {
      setErrorMessage('ارسال دوباره ایمیل تأیید انجام نشد.')
    } finally { setResending(false) }
  }

  return (
    <div className={isSignup ? 'w-full max-w-2xl' : 'w-full max-w-md'}>
      <div className="flex flex-col items-center text-center">
        <img src="https://netstore.app/logo/netstore-logo-blue.svg" alt="لوگوی نت‌استور" className="h-12 w-auto" />
        <h1 className="mt-4 text-2xl font-bold tracking-tight">{isSignup ? 'ساخت حساب توسعه‌دهنده' : 'ورود به نت‌استور'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{isSignup ? 'ثبت‌نام توسعه‌دهندگان نت‌استور' : 'پنل توسعه‌دهندگان'}</p>
      </div>

      {isSignup ? (
        <>
          <SignupStepper current={signupStep} />
          <div className="mt-7 rounded-2xl border border-border bg-card p-6 sm:p-8">
            {signupStep === 1 && <div>
              <StepHeader title="اطلاعات ورود" text="ایمیل و رمز عبوری که برای ورود به پنل استفاده می‌کنید." />
              <div className="mt-6"><Label htmlFor="signup-email">ایمیل</Label><Input id="signup-email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="mt-1.5 h-11 text-left" /></div>
              <div className="mt-5"><Label htmlFor="signup-password">رمز عبور</Label><div className="relative mt-1.5"><Input id="signup-password" type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="حداقل ۸ کاراکتر" minLength={8} autoComplete="new-password" className="h-11 pl-11 pr-3 text-left" /><PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} /></div><p className="mt-2 text-xs text-muted-foreground">رمز عبور باید حداقل ۸ کاراکتر باشد و رمز رایج، تماماً عددی یا مشابه اطلاعات حساب نباشد.</p></div>
            </div>}

            {signupStep === 2 && <div><StepHeader title="نوع حساب" text="نوع حساب توسعه‌دهنده خود را مشخص کنید." /><div className="mt-6 grid gap-4 sm:grid-cols-2"><AccountTypeCard active={accountType === 'individual'} icon={<UserRound className="size-6" />} title="شخص حقیقی" text="برای توسعه‌دهندگان و ناشران شخصی" onClick={() => setAccountType('individual')} /><AccountTypeCard active={accountType === 'legal'} icon={<Building2 className="size-6" />} title="شخص حقوقی" text="برای شرکت‌ها، سازمان‌ها و استودیوها" onClick={() => setAccountType('legal')} /></div></div>}

            {signupStep === 3 && <div>
              <StepHeader title={accountType === 'legal' ? 'اطلاعات شخص حقوقی' : 'اطلاعات شخص حقیقی'} text="اطلاعات هویتی حساب توسعه‌دهنده را وارد کنید." />
              {accountType === 'legal' && <div className="mt-6"><Label htmlFor="organization">نام شرکت یا سازمان</Label><Input id="organization" value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-1.5 h-11" autoComplete="organization" /></div>}
              <div className="mt-5 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="name">{accountType === 'legal' ? 'نام نماینده' : 'نام'}</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5 h-11" /></div><div><Label htmlFor="lastName">{accountType === 'legal' ? 'نام خانوادگی نماینده' : 'نام خانوادگی'}</Label><Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="mt-1.5 h-11" /></div></div>
              <div className="mt-5"><Label htmlFor="nationalId">{accountType === 'legal' ? 'شناسه ملی شرکت' : 'کد ملی'}</Label><Input id="nationalId" value={nationalId} onChange={(e) => setNationalId(asciiDigits(e.target.value).replace(/\D/g, ''))} dir="ltr" inputMode="numeric" className="mt-1.5 h-11 text-left" maxLength={accountType === 'legal' ? 11 : 10} /></div>
              {accountType === 'legal' && <div className="mt-5">
                <Label htmlFor="ceo-national-card">تصویر کارت ملی مدیرعامل <span className="text-muted-foreground">(اختیاری)</span></Label>
                <Input id="ceo-national-card" type="file" accept="image/png,image/jpeg" disabled={loading} aria-describedby="ceo-national-card-help" aria-invalid={Boolean(ceoNationalCardError)} className="mt-1.5" onChange={(event) => { selectCeoNationalCard(event.target.files?.[0]); event.currentTarget.value = '' }} />
                <p id="ceo-national-card-help" className="mt-2 text-xs text-muted-foreground">تصویر واضح و خوانا؛ PNG یا JPEG، حداکثر ۲ مگابایت.</p>
                {ceoNationalCardError && <p role="alert" className="mt-2 text-xs text-destructive">{ceoNationalCardError}</p>}
                {ceoNationalCard && <div className="mt-3 rounded-xl border border-border p-3">
                  {ceoNationalCardPreview && <img src={ceoNationalCardPreview} alt="پیش‌نمایش کارت ملی مدیرعامل" className="max-h-48 max-w-full rounded-lg object-contain" />}
                  <p className="mt-2 break-all text-xs text-muted-foreground">{ceoNationalCard.name}</p>
                  <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => { setCeoNationalCard(null); setCeoNationalCardError('') }} className="mt-2 text-destructive">حذف تصویر</Button>
                </div>}
              </div>}
            </div>}

            {signupStep === 4 && <div>
              <StepHeader title="شماره موبایل و قوانین" text="شماره موبایل اختیاری است؛ تأیید ایمیل پس از ثبت‌نام الزامی است." />
              <div className="mt-6"><Label htmlFor="signup-phone">شماره موبایل <span className="text-muted-foreground">(اختیاری)</span></Label><Input id="signup-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="09121234567" dir="ltr" inputMode="tel" className="mt-1.5 h-11 text-left" /></div>
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm leading-7"><input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-1 size-4" /><span>قوانین و شرایط انتشار نت‌استور را مطالعه کرده‌ام و می‌پذیرم. <Link href="/rules" target="_blank" className="font-medium text-primary hover:underline">مشاهده قوانین</Link></span></label>
            </div>}

            {errorMessage && <p role="alert" className="mt-5 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5"><Button type="button" variant="ghost" onClick={goBack} disabled={signupStep === 1 || loading} className="gap-2"><ArrowRight className="size-4" />مرحله قبل</Button>{signupStep < 4 ? <Button type="button" onClick={goNext} disabled={!stepValid || loading} className="gap-2">مرحله بعد<ArrowLeft className="size-4" /></Button> : <Button type="button" onClick={finishSignup} disabled={!stepValid || loading} className="gap-2">{loading ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}ثبت‌نام و ارسال ایمیل تأیید</Button>}</div>
          </div>
          <p className="mt-5 text-center text-sm text-muted-foreground">قبلاً ثبت‌نام کرده‌اید؟ <Link href="/login" className="font-medium text-primary hover:underline">وارد شوید</Link></p>
        </>
      ) : (
        <form onSubmit={handleLogin} className="mt-8 flex flex-col gap-4 rounded-2xl border border-border bg-card p-6">
          {verificationResult === 'success' && <p role="status" className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">ایمیل شما با موفقیت تأیید شد. اکنون می‌توانید وارد شوید.</p>}
          {passwordReset && <p role="status" className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">رمز عبور با موفقیت تغییر کرد. اکنون با رمز جدید وارد شوید.</p>}
          {verificationResult === 'failed' && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">لینک تأیید ایمیل نامعتبر یا منقضی شده است.</p>}
          {registered && <div className="rounded-lg bg-primary/5 px-3 py-3 text-sm leading-7"><p>ثبت‌نام انجام شد. برای ورود ابتدا ایمیل خود را تأیید کنید.</p><Button type="button" variant="link" className="h-auto px-0" onClick={() => void resendVerification()} disabled={resending}>{resending ? 'در حال ارسال...' : 'ارسال دوباره ایمیل تأیید'}</Button></div>}
          <div className="flex flex-col gap-1.5"><Label htmlFor="email">ایمیل</Label><Input id="email" type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" className="h-11 text-left" required /></div>
          <div className="flex flex-col gap-1.5"><Label htmlFor="password">رمز عبور</Label><div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} autoComplete="current-password" className="h-11 pl-11 pr-3 text-left" required /><PasswordToggle show={showPassword} onToggle={() => setShowPassword((v) => !v)} /></div></div>
          {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
          {successMessage && <p role="status" className="rounded-lg bg-primary/5 px-3 py-2 text-sm text-primary">{successMessage}</p>}
          <Button type="submit" size="lg" disabled={loading} className="mt-2 gap-2">{loading && <Loader2 className="size-4 animate-spin" />}ورود</Button>
          <div className="flex flex-col gap-3 text-center text-sm"><Link href="/forgot-password" className="font-medium text-primary hover:underline">رمز عبور را فراموش کرده‌اید؟</Link><p className="text-muted-foreground">حساب کاربری ندارید؟ <Link href="/signup" className="font-medium text-primary hover:underline">ثبت‌نام</Link></p></div>
        </form>
      )}
    </div>
  )
}

function SignupStepper({ current }: { current: number }) {
  return <div className="mt-8 overflow-x-auto pb-1"><div className="relative mx-auto flex min-w-[520px] max-w-xl items-start justify-between px-2"><div className="absolute left-[9%] right-[9%] top-4 h-px bg-border" /><div className="absolute right-[9%] top-4 h-px bg-primary transition-all" style={{ width: `${((current - 1) / (signupSteps.length - 1)) * 82}%` }} />{signupSteps.map((title, index) => { const number=index+1; const done=number<current; const active=number===current; return <div key={title} className="relative z-10 flex w-28 flex-col items-center gap-2 text-center"><span className={`flex size-8 items-center justify-center rounded-full border text-xs font-bold ${done || active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background text-muted-foreground'}`}>{done ? <Check className="size-4" /> : number.toLocaleString('fa-IR')}</span><span className={`text-xs ${active ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{title}</span></div> })}</div></div>
}
function StepHeader({ title, text }: { title:string; text:string }) { return <div><h2 className="text-lg font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div> }
function AccountTypeCard({ active, icon, title, text, onClick }: { active:boolean; icon:React.ReactNode; title:string; text:string; onClick:()=>void }) { return <button type="button" onClick={onClick} className={`rounded-2xl border p-5 text-right transition-colors ${active ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary/50'}`}><span className={active ? 'text-primary' : 'text-muted-foreground'}>{icon}</span><p className="mt-3 font-semibold">{title}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{text}</p></button> }
function PasswordToggle({ show, onToggle }: { show:boolean; onToggle:()=>void }) { return <button type="button" onClick={onToggle} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground" aria-label={show ? 'پنهان کردن رمز' : 'نمایش رمز'}>{show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button> }

export function AuthForm({ mode }: { mode:'login'|'signup' }) {
  return <Suspense fallback={<div className="text-sm text-muted-foreground">در حال بارگذاری...</div>}><AuthFormInner mode={mode} /></Suspense>
}

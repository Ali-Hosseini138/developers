'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore } from '@/components/store-provider'
import { PUBLISHING_RULES } from '@/lib/publishing-rules'

function TermsAcceptanceContent() {
  const { user, authReady, acceptTerms } = useStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get('next') || '/dashboard'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//') && requestedNext !== '/terms'
    ? requestedNext
    : '/dashboard'
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      router.replace('/login?next=/terms')
      return
    }
    if (user.termsAcceptedAt) {
      router.replace(next)
    }
  }, [authReady, user, router, next])

  async function accept() {
    if (saving) return
    setSaving(true)
    setErrorMessage('')
    try {
      await acceptTerms()
      router.replace(next)
      router.refresh()
    } catch {
      setErrorMessage('ثبت پذیرش قوانین انجام نشد. دوباره تلاش کنید.')
    } finally {
      setSaving(false)
    }
  }

  if (!authReady || !user || user.termsAcceptedAt) {
    return (
      <main className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center px-4 py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-9">
        <div className="flex items-start gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">پیش از ورود به پنل</p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">قوانین و شرایط استفاده از پنل توسعه‌دهندگان</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              برای ادامه استفاده از پنل توسعه‌دهندگان نت‌استور، لطفاً قوانین زیر را مطالعه و تأیید کنید.
            </p>
          </div>
        </div>

        <div className="mt-8 max-h-[52vh] space-y-3 overflow-y-auto rounded-2xl border border-border bg-secondary/20 p-4 sm:p-5">
          {PUBLISHING_RULES.map(([title, description], index) => (
            <article key={title} className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-primary">
                  {(index + 1).toLocaleString('fa-IR')}
                </span>
                <div>
                  <h2 className="text-sm font-semibold">{title}</h2>
                  <p className="mt-1.5 text-sm leading-7 text-muted-foreground">{description}</p>
                </div>
              </div>
            </article>
          ))}
        </div>

        <p className="mt-5 text-sm leading-7 text-muted-foreground">
          با انتخاب «می‌پذیرم»، تأیید می‌کنید که قوانین فوق را مطالعه کرده‌اید و مسئولیت رعایت آن‌ها را می‌پذیرید.
        </p>

        {errorMessage && (
          <p role="alert" className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button
          type="button"
          size="lg"
          onClick={accept}
          disabled={saving}
          className="mt-6 w-full gap-2 sm:w-auto"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          {saving ? 'در حال ثبت...' : 'می‌پذیرم'}
        </Button>
      </div>
    </main>
  )
}


export default function TermsAcceptancePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center px-4 py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <TermsAcceptanceContent />
    </Suspense>
  )
}

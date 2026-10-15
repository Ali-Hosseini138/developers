'use client'

import { DeveloperInstallStats } from '@/components/developer-install-stats'
import { DeveloperTicket } from '@/components/developer-ticket'
import { PaymentCommitmentSummary } from '@/components/payment-commitment-summary'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Activity, AlertTriangle, FileText, HelpCircle, Package, Pencil, Plus, Search, Ticket, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/components/store-provider'
import { followUpTicket } from '@/lib/support-tickets'
import { toFa } from '@/lib/format'
import { DeveloperSidebar } from '@/components/developer-sidebar'

const tabs = [
  { id: 'apps', label: 'داشبورد من', icon: Package },
  { id: 'analytics', label: 'آمار و نصب', icon: Activity },
  { id: 'finance', label: 'آمار فروش', icon: Wallet },
  { id: 'support', label: 'پشتیبانی و تیکت', icon: HelpCircle },
] as const

type Tab = (typeof tabs)[number]['id']

function DashboardPageInner() {
  const { user, authReady, myApps, cancelSubmission, tickets, addTicket } = useStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const initialTab = tabs.some((item) => item.id === requestedTab) ? requestedTab as Tab : 'apps'
  const [tab, setTab] = useState<Tab>(initialTab)

  useEffect(() => {
    const nextTab = tabs.some((item) => item.id === requestedTab) ? requestedTab as Tab : 'apps'
    setTab(nextTab)
  }, [requestedTab])

  function changeTab(nextTab: Tab) {
    setTab(nextTab)
    const href = nextTab === 'apps' ? '/dashboard' : `/dashboard?tab=${nextTab}`
    router.replace(href, { scroll: false })
  }
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [ticketSending, setTicketSending] = useState(false)
  const [ticketError, setTicketError] = useState('')

  useEffect(() => { if (authReady && !user) router.replace('/login?next=/dashboard') }, [authReady, user, router])
  if (!authReady) return <PageLoading />
  if (!user) return null

  const myTickets = tickets

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim() || ticketSending) return
    setTicketSending(true)
    setTicketError('')
    try {
      await addTicket({ subject: subject.trim(), question: message.trim() })
      setSubject('')
      setMessage('')
    } catch (error) {
      setTicketError(error instanceof Error ? error.message : 'ارسال تیکت انجام نشد. دوباره تلاش کنید.')
    } finally {
      setTicketSending(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:pr-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">پنل توسعه‌دهنده</h1><p className="mt-1 text-sm text-muted-foreground">{user.name}، مدیریت اپلیکیشن‌ها و ارتباط با نت‌استور</p></div>
        {tab === 'apps' && (
          <Button render={<Link href="/upload" />} className="gap-1.5">
            <Plus className="size-4" />
            انتشار اپلیکیشن جدید
          </Button>
        )}
      </div>

      <div className="mt-8">
        <DeveloperSidebar activeTab={tab} onTabChange={changeTab} />

        <div className="min-w-0 lg:pr-24">
          {tab === 'apps' && <AppsTab myApps={myApps} cancelSubmission={cancelSubmission} />}
          {tab === 'analytics' && <DeveloperInstallStats myApps={myApps} />}
          {tab === 'finance' && <FinanceTab />}
          {tab === 'support' && <SupportTab subject={subject} message={message} setSubject={setSubject} setMessage={setMessage} submitTicket={submitTicket} tickets={myTickets} sending={ticketSending} errorMessage={ticketError} />}
        </div>
      </div>
    </main>
  )
}

function AppsTab({ myApps, cancelSubmission }: { myApps: ReturnType<typeof useStore>['myApps']; cancelSubmission: (id: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'processing' | 'pending' | 'published' | 'rejected'>('all')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null)

  const processingCount = myApps.filter((app) => app.status === 'processing').length
  const pendingCount = myApps.filter((app) => app.status === 'pending').length
  const publishedCount = myApps.filter((app) => app.status === 'published').length
  const rejectedCount = myApps.filter((app) => app.status === 'rejected' || app.status === 'parse_failed').length

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    return myApps.filter((app) => {
      const normalizedStatus = app.status === 'parse_failed' ? 'rejected' : app.status
      const matchesStatus = statusFilter === 'all' || normalizedStatus === statusFilter
      const matchesQuery = !q || app.name.toLowerCase().includes(q) || app.packageName?.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [myApps, query, statusFilter])

  const statusLabel = (app: (typeof myApps)[number]) => {
    if (app.latestSubmissionDisplay) return app.latestSubmissionDisplay
    if (app.status === 'published') return 'منتشر شده'
    if (app.status === 'processing') return 'در حال پردازش'
    if (app.status === 'pending') return 'در انتظار بررسی'
    if (app.status === 'parse_failed') return 'خطای فایل'
    if (app.status === 'rejected') return 'رد شده'
    if (app.status === 'cancelled') return 'لغو شده'
    return 'ثبت شده'
  }

  const statusHelp = (app: (typeof myApps)[number]) => {
    if (app.status === 'published') return 'این اپلیکیشن در فروشگاه منتشر شده است.'
    if (app.status === 'processing') return 'APK در حال پردازش و بررسی فنی است.'
    if (app.status === 'pending') return 'پردازش فایل تمام شده و درخواست در صف بررسی نت‌استور است.'
    if (app.status === 'parse_failed') return 'آخرین APK ارسالی با خطا پردازش شده است. پس از اصلاح و ذخیره اطلاعات، APK را برای پردازش مجدد ارسال کنید.'
    if (app.status === 'rejected') return 'درخواست توسط تیم بررسی رد شده است؛ اطلاعات را اصلاح یا APK جدید ارسال کنید.'
    if (app.status === 'cancelled') return 'آخرین درخواست توسط شما لغو شده است.'
    return 'وضعیت فعلی اپلیکیشن نمایش داده شده است.'
  }

  const statusVariant = (status?: string): 'default' | 'secondary' | 'outline' => {
    if (status === 'published') return 'default'
    if (status === 'processing' || status === 'pending') return 'secondary'
    return 'outline'
  }

  async function cancel(appId: string, submissionId: string) {
    if (cancellingId) return
    setCancellingId(appId)
    setActionError(null)
    try {
      await cancelSubmission(submissionId)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'cancel_failed'
      setActionError({
        id: appId,
        message: code === 'state_changed'
          ? 'وضعیت درخواست تغییر کرده است. صفحه را تازه کنید.'
          : 'لغو درخواست انجام نشد. دوباره تلاش کنید.',
      })
    } finally {
      setCancellingId(null)
    }
  }

  return <>
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard icon={<Package className="size-5" />} value={toFa(myApps.length)} label="کل اپلیکیشن‌ها" />
      <StatCard icon={<Activity className="size-5" />} value={toFa(processingCount)} label="در حال پردازش" />
      <StatCard icon={<Ticket className="size-5" />} value={toFa(pendingCount)} label="در انتظار بررسی" />
      <StatCard icon={<Package className="size-5" />} value={toFa(publishedCount)} label="منتشر شده" />
      <StatCard icon={<AlertTriangle className="size-5" />} value={toFa(rejectedCount)} label="نیازمند اقدام" />
    </div>

    <section className="mt-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">اپلیکیشن‌های من</h2>
          <p className="mt-1 text-sm text-muted-foreground">وضعیت پردازش، بررسی و انتشار اپلیکیشن‌ها را اینجا ببینید.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو نام یا Package Name" className="w-full pr-9 sm:w-64" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">همه وضعیت‌ها</option>
            <option value="processing">در حال پردازش</option>
            <option value="pending">در انتظار بررسی</option>
            <option value="published">منتشر شده</option>
            <option value="rejected">نیازمند اقدام</option>
          </select>
        </div>
      </div>

      {myApps.length === 0 ? <EmptyApps /> : filteredApps.length ? (
        <div className="mt-4 flex flex-col gap-3">
          {filteredApps.map((app) => (
            <div key={app.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                <img src={app.icon || '/placeholder.svg'} alt={`آیکون ${app.name}`} className="size-14 rounded-xl border border-border object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{app.name}</h3>
                    <Badge variant={statusVariant(app.status)}>{statusLabel(app)}</Badge>
                  </div>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{app.tagline}</p>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {app.packageName && <span dir="ltr">{app.packageName}</span>}
                    {app.isPublished && <span>نصب فعلی: {toFa(app.downloads)}</span>}
                    <span>آخرین تغییر: {app.updatedAt}</span>
                  </div>
                  <p className="mt-2 text-xs">{statusHelp(app)}</p>
                  <PaymentCommitmentSummary app={app} />
                  {Boolean(app.submissionHistory?.length) && <details className="mt-3 rounded-lg border border-border p-3 text-xs">
                    <summary className="cursor-pointer font-medium">تاریخچه ارسال‌ها</summary>
                    <ol className="mt-3 space-y-3">{app.submissionHistory!.map(submission => <li key={submission.id} className="rounded-lg bg-secondary/50 p-3 leading-6">
                      <p>درخواست {toFa(submission.id)} · {submission.kind === 'new' ? 'انتشار اولیه' : 'نسخه جدید'} · {submission.statusDisplay}</p>
                      {submission.versionName && <p>نسخه: <span dir="ltr">{submission.versionName}</span></p>}
                      {([['ارسال', submission.submittedAt], ['نتیجه بررسی', submission.decidedAt], ['لغو', submission.cancelledAt]] as const).map(([label, value]) => value && <p key={label}>{label}: {new Date(value).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>)}
                      {submission.rejectionReason && <p className="whitespace-pre-wrap text-destructive">دلیل رد: {submission.rejectionReason}</p>}
                    </li>)}</ol>
                  </details>}

                  {(app.status === 'rejected' || app.status === 'parse_failed') && (app.rejectionReason || app.latestSubmissionErrors?.length) ? (
                    <div className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm">
                      <p className="mb-2 text-xs font-medium">نتیجه آخرین ارسال APK؛ این پیام خطای ذخیره اطلاعات نیست.</p>
                      {app.rejectionReason && <p><span className="font-medium text-destructive">دلیل رد: </span>{app.rejectionReason}</p>}
                      {app.latestSubmissionErrors?.map((item) => <p key={item.code} className="mt-1"><span className="font-medium text-destructive">{item.code}: </span>{item.message}</p>)}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {app.canEdit && (
                    <Button render={<Link href={`/dashboard/edit/${app.id}`} />} size="sm" variant="outline" className="gap-1">
                      <Pencil className="size-4" />
                      ویرایش اطلاعات
                    </Button>
                  )}
                  {app.canSubmit && (
                    <Button render={<Link href={`/dashboard/version/${app.id}`} />} size="sm" className="gap-1">
                      <Plus className="size-4" />
                      {app.isPublished ? 'نسخه جدید' : 'ارسال APK جدید'}
                    </Button>
                  )}
                  {app.latestSubmissionCanCancel && app.latestSubmissionId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void cancel(app.id, app.latestSubmissionId!)}
                      disabled={cancellingId === app.id}
                    >
                      {cancellingId === app.id ? 'در حال لغو...' : 'لغو درخواست'}
                    </Button>
                  )}
                </div>
              </div>

              {actionError?.id === app.id && (
                <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {actionError.message}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : <div className="mt-4 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">اپلیکیشنی با این فیلتر پیدا نشد.</div>}
    </section>
  </>
}

function FinanceTab() {
  return (
    <section className="mt-8">
      <div className="mx-auto flex min-h-[360px] max-w-2xl flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wallet className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-bold">آمار فروش به‌زودی اضافه می‌شود</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          این بخش برای اپلیکیشن‌هایی که نت‌باکس پیمنت دارند، به‌زودی اضافه می‌شود.
        </p>
      </div>
    </section>
  )
}

function formatToman(value: number) {
  return `${value.toLocaleString('fa-IR')} تومان`
}

function SupportTab({ subject, message, setSubject, setMessage, submitTicket, tickets, sending, errorMessage }: {
  subject: string; message: string; setSubject: (value: string) => void; setMessage: (value: string) => void;
  submitTicket: (event: React.FormEvent) => void; tickets: ReturnType<typeof useStore>['tickets']; sending: boolean; errorMessage: string
}) {
  const { reloadTickets, ticketsError } = useStore()
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; void reloadTickets().finally(() => { if (active) setLoading(false) }); return () => { active = false } }, [reloadTickets])
  async function refresh() { setLoading(true); try { await reloadTickets() } finally { setLoading(false) } }
  return <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
    <form onSubmit={submitTicket} className="self-start rounded-2xl border border-border bg-card p-6">
      <h2 className="flex items-center gap-3 font-bold"><FileText className="size-5 text-primary" />ارسال تیکت جدید</h2>
      <p className="mt-2 text-sm text-muted-foreground">پیام شما به تیم نت‌استور ارسال می‌شود</p>
      <div className="mt-6 flex flex-col gap-4">
        <div><Label htmlFor="ticket-subject">موضوع</Label><Input id="ticket-subject" value={subject} disabled={sending} onChange={event => setSubject(event.target.value)} minLength={1} maxLength={200} required placeholder="مثلاً مشکل در انتشار نسخه جدید" className="mt-1.5" /></div>
        <div><Label htmlFor="ticket-message">توضیحات</Label><Textarea id="ticket-message" value={message} disabled={sending} onChange={event => setMessage(event.target.value)} minLength={1} maxLength={10000} required placeholder="مشکل یا درخواست خود را توضیح دهید..." className="mt-1.5 min-h-32" /></div>
        {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
        <Button type="submit" className="gap-2" disabled={sending || !subject.trim() || !message.trim()}><Ticket className="size-4" />{sending ? 'در حال ارسال...' : 'ارسال به تیم پشتیبانی'}</Button>
      </div>
    </form>
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between gap-3"><h2 className="font-bold">تیکت‌های من</h2><Button variant="outline" disabled={loading} onClick={() => void refresh()}>{loading ? 'در حال دریافت...' : 'تازه‌سازی'}</Button></div>
      <p className="mt-2 text-xs text-muted-foreground">هر تیکت یک پاسخ دارد؛ برای ادامه، تیکت جدید برای پیگیری ثبت کنید.</p>
      {ticketsError && <p role="alert" className="mt-3 text-sm text-destructive">{ticketsError}</p>}
      <div className="mt-4 flex flex-col gap-3">{tickets.length ? tickets.map(ticket => <DeveloperTicket key={ticket.id} ticket={ticket} onFollowUp={ticket => {
        if (sending) return
        if ((subject.trim() || message.trim()) && !window.confirm('متن فعلی فرم با پیگیری این تیکت جایگزین شود؟')) return
        const draft = followUpTicket(ticket); setSubject(draft.subject); setMessage(draft.question)
        document.getElementById('ticket-message')?.focus()
      }} />) : !loading && !ticketsError ? <p className="py-12 text-center text-sm text-muted-foreground">هنوز تیکتی ثبت نکرده‌اید.</p> : null}</div>
    </div>
  </section>
}
function EmptyApps() { return <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center"><Package className="size-8 text-muted-foreground" /><div><p className="font-medium">هنوز اپلیکیشنی ثبت نکرده‌اید</p><p className="mt-1 text-sm text-muted-foreground">اولین اپلیکیشن را اضافه کنید تا وضعیت بررسی و انتشار آن را از همین داشبورد دنبال کنید.</p></div><Button render={<Link href="/upload" />} className="gap-1"><Plus className="size-4" />ثبت اولین اپلیکیشن</Button></div> }
function PageLoading() { return <main className="mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری حساب...</span></main> }
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div> }


export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardPageInner />
    </Suspense>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Activity, AlertTriangle, FileText, HelpCircle, Megaphone, Package, Pencil, Plus, Search, Ticket, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/components/store-provider'
import { toFa } from '@/lib/format'
import { BANNER_PLACEMENT, INSTALL_CAMPAIGN_CONFIG } from '@/lib/monetization'
import { createClient } from '@/lib/supabase/client'

const tabs = [
  { id: 'apps', label: 'داشبورد من', icon: Package },
  { id: 'account', label: 'اطلاعات حساب کاربری', icon: UserRound },
  { id: 'analytics', label: 'آمار و عملکرد', icon: Activity },
  { id: 'finance', label: 'مالی', icon: Wallet },
  { id: 'growth', label: 'تبلیغات و رشد', icon: Megaphone },
  { id: 'support', label: 'پشتیبانی و تیکت', icon: HelpCircle },
] as const

type Tab = (typeof tabs)[number]['id']

export default function DashboardPage() {
  const { user, authReady, myApps, removeApp, submitAppForReview, tickets, addTicket } = useStore()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('apps')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [ticketSending, setTicketSending] = useState(false)
  const [ticketError, setTicketError] = useState('')

  useEffect(() => { if (authReady && !user) router.replace('/login?next=/dashboard') }, [authReady, user, router])
  if (!authReady) return <PageLoading />
  if (!user) return null
  const currentUser = user

  const myTickets = tickets.filter((ticket) => ticket.developer === currentUser.name)

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim() || ticketSending) return
    setTicketSending(true)
    setTicketError('')
    try {
      await addTicket({ subject: subject.trim(), message: message.trim(), status: 'open' })
      setSubject('')
      setMessage('')
    } catch {
      setTicketError('ارسال تیکت انجام نشد. دوباره تلاش کنید.')
    } finally {
      setTicketSending(false)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">پنل توسعه‌دهنده</h1><p className="mt-1 text-sm text-muted-foreground">{user.name}، مدیریت اپ‌ها و ارتباط با نت‌استور</p></div>
        <Button render={<Link href="/upload" />} className="gap-1.5"><Plus className="size-4" />انتشار اپ جدید</Button>
      </div>

      <div className="mt-8 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2 sm:grid sm:grid-cols-6">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors sm:shrink ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><Icon className="size-4" />{label}</button>)}
      </div>

      {tab === 'apps' && <AppsTab myApps={myApps} removeApp={removeApp} submitAppForReview={submitAppForReview} />}
      {tab === 'account' && <AccountTab user={user} />}
      {tab === 'analytics' && <AnalyticsTab myApps={myApps} />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'growth' && <GrowthTab myApps={myApps} />}
      {tab === 'support' && <SupportTab subject={subject} message={message} setSubject={setSubject} setMessage={setMessage} submitTicket={submitTicket} tickets={myTickets} sending={ticketSending} errorMessage={ticketError} />}
    </main>
  )
}

function AppsTab({ myApps, removeApp, submitAppForReview }: { myApps: ReturnType<typeof useStore>['myApps']; removeApp: (id: string) => Promise<void>; submitAppForReview: (id: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'published' | 'rejected'>('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [submittingId, setSubmittingId] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<{ id: string; message: string } | null>(null)

  const draftCount = myApps.filter((app) => !app.status || app.status === 'draft').length
  const pendingCount = myApps.filter((app) => app.status === 'pending').length
  const publishedCount = myApps.filter((app) => app.status === 'published').length
  const rejectedCount = myApps.filter((app) => app.status === 'rejected').length

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    return myApps.filter((app) => {
      const matchesStatus = statusFilter === 'all' || (app.status || 'draft') === statusFilter
      const matchesQuery = !q || app.name.toLowerCase().includes(q) || app.packageName?.toLowerCase().includes(q)
      return matchesStatus && matchesQuery
    })
  }, [myApps, query, statusFilter])

  const statusLabel = (status?: string) => {
    if (status === 'published') return 'منتشر شده'
    if (status === 'pending') return 'در انتظار بررسی'
    if (status === 'rejected') return 'نیازمند اصلاح'
    return 'پیش‌نویس'
  }

  const statusHelp = (status?: string) => {
    if (status === 'published') return 'این اپ در فروشگاه منتشر شده است.'
    if (status === 'pending') return 'اپ برای تیم نت‌استور ارسال شده و منتظر بررسی است.'
    if (status === 'rejected') return 'برای ادامه انتشار باید اطلاعات اپ را اصلاح و دوباره ارسال کنید.'
    return 'این اپ هنوز برای بررسی ارسال نشده است.'
  }

  const statusVariant = (status?: string): 'default' | 'secondary' | 'outline' => {
    if (status === 'published') return 'default'
    if (status === 'pending') return 'secondary'
    return 'outline'
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await removeApp(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }

  async function sendForReview(id: string) {
    if (submittingId) return
    setSubmittingId(id)
    setSubmitError(null)

    try {
      await submitAppForReview(id)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'submit_failed'
      const message =
        code === 'incomplete_app'
          ? 'اطلاعات این پیش‌نویس کامل نیست. ابتدا وارد ویرایش شوید و پکیج‌نیم، APK، آیکون، بنر و اطلاعات اصلی را کامل کنید.'
          : code === 'unauthorized'
            ? 'نشست ورود شما منقضی شده است. دوباره وارد شوید.'
            : 'ارسال برای بررسی انجام نشد. دوباره تلاش کنید.'
      setSubmitError({ id, message })
    } finally {
      setSubmittingId(null)
    }
  }

  return <>
    <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard icon={<Package className="size-5" />} value={toFa(myApps.length)} label="کل اپ‌ها" />
      <StatCard icon={<FileText className="size-5" />} value={toFa(draftCount)} label="پیش‌نویس" />
      <StatCard icon={<Ticket className="size-5" />} value={toFa(pendingCount)} label="در انتظار بررسی" />
      <StatCard icon={<Package className="size-5" />} value={toFa(publishedCount)} label="منتشر شده" />
      <StatCard icon={<AlertTriangle className="size-5" />} value={toFa(rejectedCount)} label="نیازمند اصلاح" />
    </div>

    <section className="mt-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">اپ‌های من</h2>
          <p className="mt-1 text-sm text-muted-foreground">وضعیت انتشار و آخرین تغییر هر اپ را از اینجا مدیریت کنید.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو نام یا پکیج‌نیم" className="w-full pr-9 sm:w-64" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
            <option value="all">همه وضعیت‌ها</option>
            <option value="draft">پیش‌نویس</option>
            <option value="pending">در انتظار بررسی</option>
            <option value="published">منتشر شده</option>
            <option value="rejected">نیازمند اصلاح</option>
          </select>
        </div>
      </div>

      {myApps.length === 0 ? <EmptyApps /> : filteredApps.length ? (
        <div className="mt-4 flex flex-col gap-3">
          {filteredApps.map((app) => {
            const canDelete = !app.status || app.status === 'draft' || app.status === 'rejected'
            return (
              <div key={app.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <img src={app.icon || '/placeholder.svg'} alt={`آیکون ${app.name}`} className="size-14 rounded-xl border border-border object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{app.name}</h3>
                      <Badge variant={statusVariant(app.status)}>{statusLabel(app.status)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{app.tagline}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {app.packageName && <span dir="ltr">{app.packageName}</span>}
                      <span>آخرین تغییر: {app.updatedAt}</span>
                    </div>
                    <p className="mt-2 text-xs">{statusHelp(app.status)}</p>
                    {app.status === 'rejected' && app.reviewReason && (
                      <div className="mt-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2 text-sm">
                        <span className="font-medium text-destructive">دلیل رد: </span>
                        <span>{app.reviewReason}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {app.status !== 'pending' && (
                      <Button render={<Link href={`/dashboard/edit/${app.id}`} />} size="sm" variant="outline" className="gap-1"><Pencil className="size-4" />ویرایش اطلاعات</Button>
                    )}
                    {(!app.status || app.status === 'draft') && (
                      <Button
                        size="sm"
                        onClick={() => void sendForReview(app.id)}
                        disabled={submittingId === app.id}
                      >
                        {submittingId === app.id ? 'در حال ارسال...' : 'ارسال برای بررسی'}
                      </Button>
                    )}
                    {app.status === 'published' && <Button render={<Link href={`/dashboard/version/${app.id}`} />} size="sm" className="gap-1"><Plus className="size-4" />نسخه جدید</Button>}
                    {app.status === 'rejected' && <Button render={<Link href={`/dashboard/edit/${app.id}`} />} size="sm" className="gap-1">اصلاح و ارسال مجدد</Button>}
                    {canDelete && <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(app.id)} className="text-destructive">حذف</Button>}
                  </div>
                </div>

                {submitError?.id === app.id && (
                  <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {submitError.message}
                  </p>
                )}

                {deleteTarget === app.id && (
                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">این اپ حذف شود؟</p>
                      <p className="mt-1 text-xs text-muted-foreground">این کار قابل بازگشت نیست. اپ‌های منتشرشده یا در حال بررسی از اینجا قابل حذف نیستند.</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>انصراف</Button>
                      <Button size="sm" onClick={() => void confirmDelete()} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? 'در حال حذف...' : 'حذف قطعی'}</Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : <div className="mt-4 rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">اپی با این فیلتر پیدا نشد.</div>}
    </section>
  </>
}


type InstallMetric = { metric_date: string; installs: number }
type SalesMetric = { metric_date: string; orders: number; total_sales_rial: number }

function buildDemoMetrics(days: number) {
  const installs: InstallMetric[] = []
  const sales: SalesMetric[] = []
  const today = new Date()

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const index = days - 1 - i
    const wave = Math.sin(index / 3) * 18
    const growth = index * 1.6
    const installCount = Math.max(18, Math.round(64 + wave + growth + ((index * 7) % 13)))
    const orders = Math.max(3, Math.round(installCount * 0.11 + ((index * 5) % 4)))
    const averageOrderRial = 2350000 + ((index * 170000) % 620000)

    installs.push({
      metric_date: date.toISOString().slice(0, 10),
      installs: installCount,
    })

    sales.push({
      metric_date: date.toISOString().slice(0, 10),
      orders,
      total_sales_rial: orders * averageOrderRial,
    })
  }

  return { installs, sales }
}

function AnalyticsTab({ myApps }: { myApps: ReturnType<typeof useStore>['myApps'] }) {
  const supabase = useMemo(() => createClient(), [])
  const publishedApps = myApps.filter((app) => app.status === 'published')
  const [selectedAppId, setSelectedAppId] = useState(publishedApps[0]?.id || '')
  const [range, setRange] = useState<7 | 30 | 90>(30)
  const [installs, setInstalls] = useState<InstallMetric[]>([])
  const [sales, setSales] = useState<SalesMetric[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedApp = publishedApps.find((app) => app.id === selectedAppId)
  const paymentEnabled = Boolean(selectedApp?.netboxPaymentIntegrated)
  const demoMetrics = useMemo(() => buildDemoMetrics(range), [range])
  const usingDemo = !loading && installs.length === 0 && sales.length === 0
  const visibleInstalls = usingDemo ? demoMetrics.installs : installs
  const visibleSales = usingDemo ? demoMetrics.sales : sales
  const visiblePaymentEnabled = paymentEnabled || usingDemo

  useEffect(() => {
    if (!selectedAppId && publishedApps[0]?.id) setSelectedAppId(publishedApps[0].id)
  }, [publishedApps, selectedAppId])

  useEffect(() => {
    if (!selectedAppId) {
      setInstalls([])
      setSales([])
      return
    }

    const load = async () => {
      setLoading(true)
      setErrorMessage('')
      const since = new Date()
      since.setDate(since.getDate() - (range - 1))
      const sinceDate = since.toISOString().slice(0, 10)

      const installQuery = supabase
        .from('app_daily_installs')
        .select('metric_date, installs')
        .eq('app_id', selectedAppId)
        .gte('metric_date', sinceDate)
        .order('metric_date', { ascending: true })

      const salesQuery = paymentEnabled
        ? supabase
            .from('app_daily_sales')
            .select('metric_date, orders, total_sales_rial')
            .eq('app_id', selectedAppId)
            .gte('metric_date', sinceDate)
            .order('metric_date', { ascending: true })
        : Promise.resolve({ data: [], error: null })

      const [installResult, salesResult] = await Promise.all([installQuery, salesQuery])

      if (installResult.error || salesResult.error) {
        setErrorMessage('دریافت آمار انجام نشد. دوباره تلاش کنید.')
      } else {
        setInstalls((installResult.data || []) as InstallMetric[])
        setSales((salesResult.data || []) as SalesMetric[])
      }
      setLoading(false)
    }

    void load()
  }, [selectedAppId, range, paymentEnabled, supabase])

  const totalInstalls = visibleInstalls.reduce((sum, item) => sum + item.installs, 0)
  const averageDailyInstalls = visibleInstalls.length ? Math.round(totalInstalls / visibleInstalls.length) : 0
  const totalSales = visibleSales.reduce((sum, item) => sum + Number(item.total_sales_rial || 0), 0)
  const totalOrders = visibleSales.reduce((sum, item) => sum + item.orders, 0)
  const averageOrder = totalOrders ? Math.round(totalSales / totalOrders) : 0

  return (
    <section className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Label>اپلیکیشن</Label>
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="mt-1.5 h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm"
          >
            {publishedApps.length === 0 && <option value="">اپلیکیشن دمو</option>}
            {publishedApps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
          </select>
        </div>
        <div>
          <Label>بازه زمانی</Label>
          <div className="mt-1.5 flex gap-2">
            {[7, 30, 90].map((days) => (
              <Button
                key={days}
                type="button"
                size="sm"
                variant={range === days ? 'default' : 'outline'}
                onClick={() => setRange(days as 7 | 30 | 90)}
              >
                {days.toLocaleString('fa-IR')} روز
              </Button>
            ))}
          </div>
        </div>
      </div>

      {usingDemo && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <strong>داده نمایشی — Demo</strong>
          <span className="mr-2 text-muted-foreground">این اعداد واقعی نیستند و فقط برای نمایش ظاهر داشبورد استفاده می‌شوند.</span>
        </div>
      )}

      {errorMessage && !usingDemo && <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</p>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="نصب در بازه" value={toFa(totalInstalls)} />
        <MetricCard label="میانگین نصب روزانه" value={toFa(averageDailyInstalls)} />
        {visiblePaymentEnabled ? (
          <>
            <MetricCard label="فروش کل" value={formatRial(totalSales)} />
            <MetricCard label="تعداد سفارش" value={toFa(totalOrders)} />
          </>
        ) : (
          <>
            <MetricCard label="فروش اشتراک" value="غیرفعال" />
            <MetricCard label="Netbox Payment" value="متصل نیست" />
          </>
        )}
      </div>

      <TrendCard
        title="ترند روزانه نصب"
        description="تعداد نصب ثبت‌شده برای هر روز"
        loading={loading}
        points={visibleInstalls.map((item) => ({ date: item.metric_date, value: item.installs }))}
        valueFormatter={(value) => toFa(value)}
      />

      {visiblePaymentEnabled && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MetricCard label="میانگین مبلغ سفارش" value={totalOrders ? formatRial(averageOrder) : '—'} />
            <MetricCard label="وضعیت پرداخت" value={usingDemo ? 'Demo' : 'Netbox Payment فعال'} />
          </div>
          <TrendCard
            title="ترند روزانه فروش اشتراک"
            description="مجموع فروش روزانه ثبت‌شده از Netbox Payment"
            loading={loading}
            points={visibleSales.map((item) => ({ date: item.metric_date, value: Number(item.total_sales_rial || 0) }))}
            valueFormatter={formatRial}
          />
          <TrendCard
            title="ترند روزانه سفارش‌ها"
            description="تعداد خریدهای موفق ثبت‌شده در هر روز"
            loading={loading}
            points={visibleSales.map((item) => ({ date: item.metric_date, value: item.orders }))}
            valueFormatter={(value) => toFa(value)}
          />
        </>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-bold sm:text-2xl">{value}</p>
    </div>
  )
}

function TrendCard({
  title,
  description,
  loading,
  points,
  valueFormatter,
}: {
  title: string
  description: string
  loading: boolean
  points: { date: string; value: number }[]
  valueFormatter: (value: number) => string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5">
        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">در حال دریافت داده...</div>
        ) : points.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
            <Activity className="size-7 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">هنوز داده‌ای برای این بازه ثبت نشده است</p>
            <p className="mt-1 max-w-md text-xs leading-6 text-muted-foreground">
              به محض ورود داده واقعی نصب یا فروش، نمودار روزانه در همین بخش نمایش داده می‌شود.
            </p>
          </div>
        ) : (
          <MiniLineChart points={points} valueFormatter={valueFormatter} />
        )}
      </div>
    </div>
  )
}

function MiniLineChart({ points, valueFormatter }: { points: { date: string; value: number }[]; valueFormatter: (value: number) => string }) {
  const width = 1000
  const height = 260
  const paddingX = 45
  const paddingY = 30
  const max = Math.max(...points.map((p) => p.value), 1)
  const min = Math.min(...points.map((p) => p.value), 0)
  const range = Math.max(max - min, 1)

  const mapped = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : paddingX + (index / (points.length - 1)) * (width - paddingX * 2)
    const y = height - paddingY - ((point.value - min) / range) * (height - paddingY * 2)
    return { ...point, x, y }
  })

  const path = mapped.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const labelEvery = Math.max(1, Math.ceil(points.length / 6))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height + 45}`} className="min-w-[720px] w-full" role="img" aria-label="نمودار روند روزانه">
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingY + ratio * (height - paddingY * 2)
          const value = max - ratio * range
          return (
            <g key={ratio}>
              <line x1={paddingX} x2={width - paddingX} y1={y} y2={y} className="stroke-border" strokeDasharray="4 6" />
              <text x={paddingX - 8} y={y + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{valueFormatter(Math.max(0, Math.round(value)))}</text>
            </g>
          )
        })}
        <path d={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {mapped.map((point, index) => (
          <g key={`${point.date}-${index}`}>
            <circle cx={point.x} cy={point.y} r="4" className="fill-background stroke-primary" strokeWidth="2" />
            {(index % labelEvery === 0 || index === mapped.length - 1) && (
              <text x={point.x} y={height + 22} textAnchor="middle" className="fill-muted-foreground text-[11px]">
                {new Date(`${point.date}T00:00:00`).toLocaleDateString('fa-IR', { month: 'numeric', day: 'numeric' })}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function formatRial(value: number) {
  return `${Math.round(value).toLocaleString('fa-IR')} ریال`
}

function AccountTab({ user }: { user: NonNullable<ReturnType<typeof useStore>['user']> }) {
  return (
    <section className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserRound className="size-5 text-primary" />
          <div><h2 className="font-bold">اطلاعات حساب کاربری</h2><p className="text-sm text-muted-foreground">اطلاعات ثبت‌شده توسعه‌دهنده</p></div>
        </div>
        <Button render={<Link href="/account" />} size="sm" variant="outline">ویرایش اطلاعات</Button>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <ReadOnly label="نام یا سازمان" value={user.name} />
        <ReadOnly label="ایمیل" value={user.email} />
        <ReadOnly label="شماره تلفن" value={user.phone || 'ثبت نشده'} />
        <ReadOnly label="کد ملی" value={user.nationalId || 'ثبت نشده'} />
      </div>
    </section>
  )
}
function ReadOnly({ label, value }: { label: string; value: string }) { return <div><Label>{label}</Label><Input value={value} readOnly className="mt-1.5 bg-secondary/50" /></div> }
function FinanceTab() {
  const demo = useMemo(() => buildDemoMetrics(30), [])
  const totalSales = demo.sales.reduce((sum, item) => sum + item.total_sales_rial, 0)
  const totalOrders = demo.sales.reduce((sum, item) => sum + item.orders, 0)
  const averageOrder = totalOrders ? Math.round(totalSales / totalOrders) : 0
  const bestDay = demo.sales.reduce((best, item) => item.total_sales_rial > best.total_sales_rial ? item : best, demo.sales[0])

  return (
    <section className="mt-8 flex flex-col gap-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
        <strong>داده نمایشی — Demo</strong>
        <span className="mr-2 text-muted-foreground">این بخش هنوز به تسویه و تراکنش واقعی متصل نشده و اعداد زیر فقط برای دمو هستند.</span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="فروش ۳۰ روز اخیر" value={formatRial(totalSales)} />
        <MetricCard label="تراکنش موفق" value={toFa(totalOrders)} />
        <MetricCard label="میانگین سفارش" value={formatRial(averageOrder)} />
        <MetricCard label="بهترین روز فروش" value={formatRial(bestDay.total_sales_rial)} />
      </div>

      <TrendCard
        title="روند فروش ۳۰ روز اخیر"
        description="فروش روزانه اشتراک — داده نمایشی"
        loading={false}
        points={demo.sales.map((item) => ({ date: item.metric_date, value: item.total_sales_rial }))}
        valueFormatter={formatRial}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5">
          <Wallet className="size-5 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">وضعیت تسویه</p>
          <p className="mt-1 font-bold">در انتظار اتصال مالی</p>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">پس از اتصال Backend مالی، مبلغ قابل تسویه و سوابق واقعی اینجا نمایش داده می‌شوند.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">فروش امروز</p>
          <p className="mt-2 text-2xl font-bold">{formatRial(demo.sales.at(-1)?.total_sales_rial || 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground">داده نمایشی</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">سفارش امروز</p>
          <p className="mt-2 text-2xl font-bold">{toFa(demo.sales.at(-1)?.orders || 0)}</p>
          <p className="mt-2 text-xs text-muted-foreground">داده نمایشی</p>
        </div>
      </div>
    </section>
  )
}


function formatToman(value: number) {
  return `${value.toLocaleString('fa-IR')} تومان`
}

function GrowthTab({ myApps }: { myApps: ReturnType<typeof useStore>['myApps'] }) {
  const publishedApps = myApps.filter((app) => app.status === 'published')
  const [installAppId, setInstallAppId] = useState('')
  const [installCount, setInstallCount] = useState(1000)
  const [bannerAppId, setBannerAppId] = useState('')
  const [bannerMonths, setBannerMonths] = useState(1)

  const pricePerInstall = INSTALL_CAMPAIGN_CONFIG.pricePerInstallToman
  const installTotal = pricePerInstall == null ? null : installCount * pricePerInstall
  const bannerReady = Boolean(bannerAppId) && bannerMonths >= 1

  if (publishedApps.length === 0) {
    return (
      <section className="mt-8 rounded-2xl border border-dashed border-border bg-card p-10 text-center">
        <Megaphone className="mx-auto size-8 text-muted-foreground" />
        <h2 className="mt-3 font-bold">تبلیغات و رشد</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          برای خرید نصب یا رزرو بنر، ابتدا باید حداقل یک اپلیکیشن منتشرشده داشته باشید.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-8 grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Package className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">خرید نصب</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              تعداد نصب هدف را انتخاب کنید و هزینه کل کمپین را قبل از پرداخت ببینید.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <Label>اپلیکیشن</Label>
            <select
              value={installAppId}
              onChange={(e) => setInstallAppId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">انتخاب اپلیکیشن</option>
              {publishedApps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
          </div>

          <div>
            <Label htmlFor="install-count">تعداد نصب هدف</Label>
            <Input
              id="install-count"
              type="number"
              min={INSTALL_CAMPAIGN_CONFIG.minInstalls}
              max={INSTALL_CAMPAIGN_CONFIG.maxInstalls}
              step={INSTALL_CAMPAIGN_CONFIG.step}
              value={installCount}
              onChange={(e) => setInstallCount(Math.max(0, Number(e.target.value || 0)))}
              className="mt-1.5"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              حداقل {INSTALL_CAMPAIGN_CONFIG.minInstalls.toLocaleString('fa-IR')} نصب
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">قیمت هر نصب</p>
              <p className="mt-1 font-bold">{pricePerInstall == null ? 'تعیین نشده' : formatToman(pricePerInstall)}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">مبلغ کل</p>
              <p className="mt-1 font-bold">{installTotal == null ? '—' : formatToman(installTotal)}</p>
            </div>
          </div>

          {pricePerInstall == null && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              قیمت هر نصب هنوز در تنظیمات نت‌استور وارد نشده است.
            </p>
          )}

          <Button disabled>
            ادامه به پرداخت
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            مبلغ کمپین محاسبه می‌شود؛ اتصال درگاه پرداخت در مرحله بعد انجام می‌شود.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Megaphone className="size-5" />
          </span>
          <div>
            <h2 className="font-bold">رزرو بنر نت‌استور</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              این جایگاه به‌صورت ماهانه رزرو می‌شود و هم‌زمان در سه سطح اصلی نت‌باکس و نت‌استور نمایش داده می‌شود.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          <div>
            <Label>اپلیکیشن</Label>
            <select
              value={bannerAppId}
              onChange={(e) => setBannerAppId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">انتخاب اپلیکیشن</option>
              {publishedApps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
            </select>
          </div>

          <div>
            <Label>جایگاه بنر</Label>
            <div className="mt-1.5 rounded-xl border border-border bg-secondary/40 p-4">
              <p className="font-medium">{BANNER_PLACEMENT.title}</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{BANNER_PLACEMENT.description}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-sm">
                {BANNER_PLACEMENT.surfaces.map((surface) => (
                  <li key={surface}>• {surface}</li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <Label htmlFor="banner-months">مدت نمایش</Label>
            <select
              id="banner-months"
              value={bannerMonths}
              onChange={(e) => setBannerMonths(Number(e.target.value))}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>{month.toLocaleString('fa-IR')} ماه</option>
              ))}
            </select>
          </div>

          <div className="rounded-xl bg-secondary/60 p-4">
            <p className="text-xs text-muted-foreground">قیمت رزرو</p>
            <p className="mt-1 font-bold">برای دریافت قیمت تماس بگیرید</p>
            <a
              href={`tel:${BANNER_PLACEMENT.contactPhone}`}
              dir="ltr"
              className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {BANNER_PLACEMENT.contactPhone}
            </a>
          </div>

          <Button
            render={<a href={`tel:${BANNER_PLACEMENT.contactPhone}`} />}
            disabled={!bannerReady}
          >
            تماس برای رزرو
          </Button>
        </div>
      </div>
    </section>
  )
}

function SupportTab({ subject, message, setSubject, setMessage, submitTicket, tickets, sending, errorMessage }: { subject: string; message: string; setSubject: (v: string) => void; setMessage: (v: string) => void; submitTicket: (e: React.FormEvent) => void; tickets: ReturnType<typeof useStore>['tickets']; sending: boolean; errorMessage: string }) { return <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><form onSubmit={submitTicket} className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><h2 className="font-bold">ارسال تیکت جدید</h2><p className="text-sm text-muted-foreground">پیام شما به تیم نت‌استور ارسال می‌شود</p></div></div><div className="mt-6 flex flex-col gap-4"><div><Label htmlFor="ticket-subject">موضوع</Label><Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً مشکل در انتشار نسخه جدید" className="mt-1.5" /></div><div><Label htmlFor="ticket-message">توضیحات</Label><Textarea id="ticket-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="مشکل یا درخواست خود را توضیح دهید..." className="mt-1.5 min-h-32" /></div>{errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}<Button type="submit" className="gap-2" disabled={sending || !subject.trim() || !message.trim()}><Ticket className="size-4" />{sending ? 'در حال ارسال...' : 'ارسال به تیم پشتیبانی'}</Button></div></form><div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold">تیکت‌های من</h2><div className="mt-4 flex flex-col gap-3">{tickets.length ? tickets.map((ticket) => <div key={ticket.id} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-medium">{ticket.subject}</h3><Badge variant={ticket.status === 'open' ? 'secondary' : 'outline'}>{ticket.status === 'open' ? 'در انتظار پاسخ' : ticket.status === 'answered' ? 'پاسخ داده شد' : 'بسته‌شده'}</Badge></div><p className="mt-2 text-sm leading-7 text-muted-foreground">{ticket.message}</p>{ticket.adminReply && <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-medium text-primary">پاسخ تیم نت‌استور</p><p className="mt-2 text-sm leading-7">{ticket.adminReply}</p>{ticket.repliedAt && <p className="mt-2 text-xs text-muted-foreground">{ticket.repliedAt}</p>}</div>}<p className="mt-2 text-xs text-muted-foreground">{ticket.createdAt}</p></div>) : <p className="py-12 text-center text-sm text-muted-foreground">هنوز تیکتی ثبت نکرده‌اید.</p>}</div></div></section> }
function EmptyApps() { return <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center"><Package className="size-8 text-muted-foreground" /><div><p className="font-medium">هنوز اپلیکیشنی ثبت نکرده‌اید</p><p className="mt-1 text-sm text-muted-foreground">اولین اپ را اضافه کنید تا وضعیت بررسی و انتشار آن را از همین داشبورد دنبال کنید.</p></div><Button render={<Link href="/upload" />} className="gap-1"><Plus className="size-4" />ثبت اولین اپ</Button></div> }
function PageLoading() { return <main className="mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری حساب...</span></main> }
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div> }

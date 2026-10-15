'use client'

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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:pr-32">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">پنل توسعه‌دهنده</h1><p className="mt-1 text-sm text-muted-foreground">{user.name}، مدیریت اپ‌ها و ارتباط با نت‌استور</p></div>
        {tab === 'apps' && (
          <Button render={<Link href="/upload" />} className="gap-1.5">
            <Plus className="size-4" />
            انتشار اپ جدید
          </Button>
        )}
      </div>

      <div className="mt-8">
        <DeveloperSidebar activeTab={tab} onTabChange={changeTab} />

        <div className="min-w-0 lg:pr-24">
          {tab === 'apps' && <AppsTab myApps={myApps} cancelSubmission={cancelSubmission} />}
          {tab === 'analytics' && <AnalyticsTab myApps={myApps} />}
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
    if (app.status === 'published') return 'این اپ در فروشگاه منتشر شده است.'
    if (app.status === 'processing') return 'APK در بک‌اند در حال پردازش و بررسی فنی است.'
    if (app.status === 'pending') return 'پردازش فایل تمام شده و درخواست در صف بررسی نت‌استور است.'
    if (app.status === 'parse_failed') return 'آخرین APK ارسالی با خطا پردازش شده است. پس از اصلاح و ذخیره اطلاعات، APK را برای پردازش مجدد ارسال کنید.'
    if (app.status === 'rejected') return 'درخواست توسط تیم بررسی رد شده است؛ اطلاعات را اصلاح یا APK جدید ارسال کنید.'
    if (app.status === 'cancelled') return 'آخرین درخواست توسط شما لغو شده است.'
    return 'وضعیت اپ از بک‌اند دریافت شده است.'
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
      <StatCard icon={<Package className="size-5" />} value={toFa(myApps.length)} label="کل اپ‌ها" />
      <StatCard icon={<Activity className="size-5" />} value={toFa(processingCount)} label="در حال پردازش" />
      <StatCard icon={<Ticket className="size-5" />} value={toFa(pendingCount)} label="در انتظار بررسی" />
      <StatCard icon={<Package className="size-5" />} value={toFa(publishedCount)} label="منتشر شده" />
      <StatCard icon={<AlertTriangle className="size-5" />} value={toFa(rejectedCount)} label="نیازمند اقدام" />
    </div>

    <section className="mt-10">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-bold">اپ‌های من</h2>
          <p className="mt-1 text-sm text-muted-foreground">وضعیت پردازش، بررسی و انتشار مستقیماً از بک‌اند نمایش داده می‌شود.</p>
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
                    <span>آخرین تغییر: {app.updatedAt}</span>
                  </div>
                  <p className="mt-2 text-xs">{statusHelp(app)}</p>
                  <PaymentCommitmentSummary app={app} />

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
  const publishedApps = useMemo(() => myApps.filter((app) => app.status === 'published'), [myApps])
  const hasMultipleApps = publishedApps.length > 1
  const [selectedAppId, setSelectedAppId] = useState(hasMultipleApps ? 'all' : publishedApps[0]?.id || '')
  const [range, setRange] = useState<1 | 7 | 30 | 90 | 365 | 'custom'>(30)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [installRows, setInstallRows] = useState<Array<InstallMetric & { app_id?: string }>>([])
  const [salesRows, setSalesRows] = useState<Array<SalesMetric & { app_id?: string }>>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const selectedApp = publishedApps.find((app) => app.id === selectedAppId)
  const selectedIds = selectedAppId === 'all'
    ? publishedApps.map((app) => app.id)
    : selectedAppId
      ? [selectedAppId]
      : []

  const paymentEnabled = selectedAppId === 'all'
    ? publishedApps.some((app) => app.netboxPaymentIntegrated)
    : Boolean(selectedApp?.netboxPaymentIntegrated)

  const dateWindow = useMemo(() => {
    if (range === 'custom') {
      if (!customStartDate || !customEndDate || customStartDate > customEndDate) return null
      const start = new Date(`${customStartDate}T00:00:00`)
      const end = new Date(`${customEndDate}T00:00:00`)
      const days = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
      return { start: customStartDate, end: customEndDate, days }
    }

    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - (range - 1))
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
      days: range,
    }
  }, [range, customStartDate, customEndDate])

  const demoMetrics = useMemo(() => buildDemoMetrics(dateWindow?.days || 30), [dateWindow])

  useEffect(() => {
    if (publishedApps.length > 1 && !selectedAppId) setSelectedAppId('all')
    if (publishedApps.length === 1 && !selectedAppId) setSelectedAppId(publishedApps[0].id)
    if (publishedApps.length === 0 && selectedAppId) setSelectedAppId('')
  }, [publishedApps, selectedAppId])

  useEffect(() => {
    if (selectedIds.length === 0) {
      setInstallRows([])
      setSalesRows([])
      return
    }

    const controller = new AbortController()

    const load = async () => {
      if (!dateWindow) {
        setInstallRows([])
        setSalesRows([])
        return
      }

      setLoading(true)
      setErrorMessage('')

      try {
        const params = new URLSearchParams({
          appId: selectedAppId || 'all',
          start: dateWindow.start,
          end: dateWindow.end,
        })
        const response = await fetch(`/api/developer/analytics?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)

        if (!response.ok) throw new Error(payload?.error || 'analytics_load_failed')

        setInstallRows(Array.isArray(payload?.installs) ? payload.installs as Array<InstallMetric & { app_id?: string }> : [])
        setSalesRows(Array.isArray(payload?.sales) ? payload.sales as Array<SalesMetric & { app_id?: string }> : [])
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setErrorMessage('دریافت آمار انجام نشد. دوباره تلاش کنید.')
        setInstallRows([])
        setSalesRows([])
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [selectedAppId, dateWindow, selectedIds.length])

  const aggregatedInstalls = useMemo(() => {
    if (selectedAppId !== 'all') {
      return installRows.map(({ metric_date, installs }) => ({ metric_date, installs }))
    }

    const daily = new Map<string, number>()
    for (const row of installRows) {
      daily.set(row.metric_date, (daily.get(row.metric_date) || 0) + Number(row.installs || 0))
    }
    return [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([metric_date, installs]) => ({ metric_date, installs }))
  }, [installRows, selectedAppId])

  const aggregatedSales = useMemo(() => {
    if (selectedAppId !== 'all') {
      return salesRows.map(({ metric_date, orders, total_sales_rial }) => ({ metric_date, orders, total_sales_rial }))
    }

    const daily = new Map<string, { orders: number; total_sales_rial: number }>()
    for (const row of salesRows) {
      const current = daily.get(row.metric_date) || { orders: 0, total_sales_rial: 0 }
      current.orders += Number(row.orders || 0)
      current.total_sales_rial += Number(row.total_sales_rial || 0)
      daily.set(row.metric_date, current)
    }
    return [...daily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([metric_date, values]) => ({ metric_date, ...values }))
  }, [salesRows, selectedAppId])

  const usingDemo = !loading && aggregatedInstalls.length === 0 && aggregatedSales.length === 0
  const demoMultiplier = selectedAppId === 'all' ? Math.max(publishedApps.length, 2) : 1
  const visibleInstalls = usingDemo
    ? demoMetrics.installs.map((item) => ({ ...item, installs: item.installs * demoMultiplier }))
    : aggregatedInstalls
  const visibleSales = usingDemo
    ? demoMetrics.sales.map((item) => ({
        ...item,
        orders: item.orders * demoMultiplier,
        total_sales_rial: item.total_sales_rial * demoMultiplier,
      }))
    : aggregatedSales
  const visiblePaymentEnabled = paymentEnabled || usingDemo

  const totalInstalls = visibleInstalls.reduce((sum, item) => sum + item.installs, 0)
  const averageDailyInstalls = visibleInstalls.length ? Math.round(totalInstalls / visibleInstalls.length) : 0
  const totalSales = visibleSales.reduce((sum, item) => sum + Number(item.total_sales_rial || 0), 0)
  const totalOrders = visibleSales.reduce((sum, item) => sum + item.orders, 0)
  const averageOrder = totalOrders ? Math.round(totalSales / totalOrders) : 0

  const appComparison = useMemo(() => publishedApps.map((app, index) => {
    const realInstalls = installRows
      .filter((row) => row.app_id === app.id)
      .reduce((sum, row) => sum + Number(row.installs || 0), 0)
    const appSalesRows = salesRows.filter((row) => row.app_id === app.id)
    const realSales = appSalesRows.reduce((sum, row) => sum + Number(row.total_sales_rial || 0), 0)
    const realOrders = appSalesRows.reduce((sum, row) => sum + Number(row.orders || 0), 0)

    if (!usingDemo) {
      return { app, installs: realInstalls, sales: realSales, orders: realOrders }
    }

    const installFactor = 0.72 + ((index * 17) % 45) / 100
    const salesFactor = 0.68 + ((index * 13) % 40) / 100
    const demoInstalls = Math.round(demoMetrics.installs.reduce((sum, row) => sum + row.installs, 0) * installFactor)
    const demoOrders = app.netboxPaymentIntegrated
      ? Math.round(demoMetrics.sales.reduce((sum, row) => sum + row.orders, 0) * salesFactor)
      : 0
    const demoSales = app.netboxPaymentIntegrated
      ? Math.round(demoMetrics.sales.reduce((sum, row) => sum + row.total_sales_rial, 0) * salesFactor)
      : 0

    return { app, installs: demoInstalls, sales: demoSales, orders: demoOrders }
  }), [publishedApps, installRows, salesRows, usingDemo, demoMetrics])

  return (
    <section className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Label>نمای آمار</Label>
          <select
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="mt-1.5 h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm"
          >
            {publishedApps.length === 0 && <option value="">اپلیکیشن دمو</option>}
            {hasMultipleApps && <option value="all">همه اپلیکیشن‌ها — نمای کلی</option>}
            {publishedApps.map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
          </select>
          {hasMultipleApps && selectedAppId === 'all' && (
            <p className="mt-2 text-xs text-muted-foreground">
              اعداد و نمودارها مجموع عملکرد {publishedApps.length.toLocaleString('fa-IR')} اپلیکیشن منتشرشده شما هستند.
            </p>
          )}
        </div>

        <div className="min-w-0">
          <Label>بازه زمانی</Label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {[
              { value: 1 as const, label: 'امروز' },
              { value: 7 as const, label: '۷ روز' },
              { value: 30 as const, label: '۳۰ روز' },
              { value: 90 as const, label: '۹۰ روز' },
              { value: 365 as const, label: '۱ سال' },
            ].map(({ value, label }) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={range === value ? 'default' : 'outline'}
                onClick={() => setRange(value)}
              >
                {label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={range === 'custom' ? 'default' : 'outline'}
              onClick={() => setRange('custom')}
            >
              بازه دلخواه
            </Button>
          </div>

          {range === 'custom' && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="analytics-start-date" className="text-xs">از تاریخ</Label>
                <Input
                  id="analytics-start-date"
                  type="date"
                  dir="ltr"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  max={customEndDate || undefined}
                  className="mt-1 h-10"
                />
              </div>
              <div>
                <Label htmlFor="analytics-end-date" className="text-xs">تا تاریخ</Label>
                <Input
                  id="analytics-end-date"
                  type="date"
                  dir="ltr"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  min={customStartDate || undefined}
                  className="mt-1 h-10"
                />
              </div>
              {customStartDate && customEndDate && customStartDate > customEndDate && (
                <p className="text-xs text-destructive sm:col-span-2">تاریخ پایان باید بعد از تاریخ شروع باشد.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {usingDemo && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm">
          <strong>داده نمایشی — Demo</strong>
          <span className="mr-2 text-muted-foreground">این اعداد واقعی نیستند و فقط برای نمایش ظاهر داشبورد استفاده می‌شوند.</span>
        </div>
      )}

      {errorMessage && !usingDemo && (
        <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <MetricCard label={selectedAppId === 'all' ? 'مجموع نصب اپ‌ها' : 'نصب در بازه'} value={toFa(totalInstalls)} />
        <MetricCard label="میانگین نصب روزانه" value={toFa(averageDailyInstalls)} />
      </div>

      {selectedAppId === 'all' && publishedApps.length > 1 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="border-b border-border p-5">
            <h3 className="font-bold">مقایسه اپلیکیشن‌ها</h3>
            <p className="mt-1 text-sm text-muted-foreground">عملکرد هر اپ در بازه زمانی انتخاب‌شده را کنار هم ببینید.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/60 text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 text-right font-medium">اپلیکیشن</th>
                  <th className="px-5 py-3 text-right font-medium">نصب</th>
                  <th className="px-5 py-3 text-right font-medium">فروش اشتراک</th>
                  <th className="px-5 py-3 text-right font-medium">سفارش</th>
                  <th className="px-5 py-3 text-right font-medium">سهم از نصب کل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...appComparison]
                  .sort((a, b) => b.installs - a.installs)
                  .map(({ app, installs, sales, orders }) => (
                    <tr key={app.id} className="cursor-pointer hover:bg-secondary/30" onClick={() => setSelectedAppId(app.id)}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img src={app.icon || '/placeholder.svg'} alt="" className="size-9 rounded-lg border border-border object-cover" />
                          <div>
                            <p className="font-semibold">{app.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">مشاهده جزئیات</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-medium">{toFa(installs)}</td>
                      <td className="px-5 py-4">{app.netboxPaymentIntegrated ? formatRial(sales) : '—'}</td>
                      <td className="px-5 py-4">{app.netboxPaymentIntegrated ? toFa(orders) : '—'}</td>
                      <td className="px-5 py-4">
                        {totalInstalls ? ((installs / totalInstalls) * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : '۰'}٪
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TrendCard
        title={selectedAppId === 'all' ? 'ترند روزانه نصب همه اپ‌ها' : 'ترند روزانه نصب'}
        description={selectedAppId === 'all' ? 'مجموع نصب روزانه تمام اپلیکیشن‌های منتشرشده' : 'تعداد نصب ثبت‌شده برای هر روز'}
        loading={loading}
        points={visibleInstalls.map((item) => ({ date: item.metric_date, value: item.installs }))}
        valueFormatter={(value) => toFa(value)}
      />


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

function FinanceTab() {
  return (
    <section className="mt-8">
      <div className="mx-auto flex min-h-[360px] max-w-2xl flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wallet className="size-7" />
        </span>
        <h2 className="mt-5 text-xl font-bold">آمار فروش به‌زودی اضافه می‌شود</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          آمار فروش، تعداد سفارش‌ها، روند فروش و گزارش‌های مرتبط به‌زودی در این بخش در دسترس قرار می‌گیرند.
        </p>
      </div>
    </section>
  )
}

function formatToman(value: number) {
  return `${value.toLocaleString('fa-IR')} تومان`
}

function SupportTab({ subject, message, setSubject, setMessage, submitTicket, tickets, sending, errorMessage }: { subject: string; message: string; setSubject: (v: string) => void; setMessage: (v: string) => void; submitTicket: (e: React.FormEvent) => void; tickets: ReturnType<typeof useStore>['tickets']; sending: boolean; errorMessage: string }) { return <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><form onSubmit={submitTicket} className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><h2 className="font-bold">ارسال تیکت جدید</h2><p className="text-sm text-muted-foreground">پیام شما به تیم نت‌استور ارسال می‌شود</p></div></div><div className="mt-6 flex flex-col gap-4"><div><Label htmlFor="ticket-subject">موضوع</Label><Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً مشکل در انتشار نسخه جدید" className="mt-1.5" /></div><div><Label htmlFor="ticket-message">توضیحات</Label><Textarea id="ticket-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="مشکل یا درخواست خود را توضیح دهید..." className="mt-1.5 min-h-32" /></div>{errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}<Button type="submit" className="gap-2" disabled={sending || !subject.trim() || !message.trim()}><Ticket className="size-4" />{sending ? 'در حال ارسال...' : 'ارسال به تیم پشتیبانی'}</Button></div></form><div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold">تیکت‌های من</h2><div className="mt-4 flex flex-col gap-3">{tickets.length ? tickets.map((ticket) => <div key={ticket.id} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-medium">{ticket.subject}</h3><Badge variant={ticket.status === 'open' ? 'secondary' : 'outline'}>{ticket.status === 'open' ? 'در انتظار پاسخ' : ticket.status === 'answered' ? 'پاسخ داده شد' : 'بسته‌شده'}</Badge></div><p className="mt-2 text-sm leading-7 text-muted-foreground">{ticket.message}</p>{ticket.adminReply && <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3"><p className="text-xs font-medium text-primary">پاسخ تیم نت‌استور</p><p className="mt-2 text-sm leading-7">{ticket.adminReply}</p>{ticket.repliedAt && <p className="mt-2 text-xs text-muted-foreground">{ticket.repliedAt}</p>}</div>}<p className="mt-2 text-xs text-muted-foreground">{ticket.createdAt}</p></div>) : <p className="py-12 text-center text-sm text-muted-foreground">هنوز تیکتی ثبت نکرده‌اید.</p>}</div></div></section> }
function EmptyApps() { return <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center"><Package className="size-8 text-muted-foreground" /><div><p className="font-medium">هنوز اپلیکیشنی ثبت نکرده‌اید</p><p className="mt-1 text-sm text-muted-foreground">اولین اپ را اضافه کنید تا وضعیت بررسی و انتشار آن را از همین داشبورد دنبال کنید.</p></div><Button render={<Link href="/upload" />} className="gap-1"><Plus className="size-4" />ثبت اولین اپ</Button></div> }
function PageLoading() { return <main className="mx-auto flex min-h-[40vh] max-w-6xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری حساب...</span></main> }
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div> }


export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <DashboardPageInner />
    </Suspense>
  )
}

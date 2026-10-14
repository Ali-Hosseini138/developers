'use client'

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
import { createClient } from '@/lib/supabase/client'
import { DeveloperSidebar } from '@/components/developer-sidebar'

const tabs = [
  { id: 'apps', label: 'داشبورد من', icon: Package },
  { id: 'analytics', label: 'آمار و نصب', icon: Activity },
  { id: 'finance', label: 'آمار فروش', icon: Wallet },
  { id: 'support', label: 'پشتیبانی و تیکت', icon: HelpCircle },
] as const

type Tab = (typeof tabs)[number]['id']

function DashboardPageInner() {
  const { user, authReady, myApps, removeApp, submitAppForReview, tickets, addTicket } = useStore()
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
          {tab === 'apps' && <AppsTab myApps={myApps} removeApp={removeApp} submitAppForReview={submitAppForReview} />}
          {tab === 'analytics' && <AnalyticsTab myApps={myApps} />}
          {tab === 'finance' && <FinanceTab />}
          {tab === 'support' && <SupportTab subject={subject} message={message} setSubject={setSubject} setMessage={setMessage} submitTicket={submitTicket} tickets={myTickets} sending={ticketSending} errorMessage={ticketError} />}
        </div>
      </div>
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
          ? 'اطلاعات این پیش‌نویس کامل نیست. ابتدا وارد ویرایش شوید و Package Name، APK، آیکون، بنر و اطلاعات اصلی را کامل کنید.'
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
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="جستجو نام یا Package Name" className="w-full pr-9 sm:w-64" />
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

    const load = async () => {
      setLoading(true)
      setErrorMessage('')

      if (!dateWindow) {
        setInstallRows([])
        setSalesRows([])
        setLoading(false)
        return
      }

      let installQuery = supabase
        .from('app_daily_installs')
        .select('app_id, metric_date, installs')
        .gte('metric_date', dateWindow.start)
        .lte('metric_date', dateWindow.end)
        .order('metric_date', { ascending: true })

      installQuery = selectedIds.length === 1
        ? installQuery.eq('app_id', selectedIds[0])
        : installQuery.in('app_id', selectedIds)

      const paymentAppIds = selectedAppId === 'all'
        ? publishedApps.filter((app) => app.netboxPaymentIntegrated).map((app) => app.id)
        : paymentEnabled && selectedAppId
          ? [selectedAppId]
          : []

      const salesPromise = paymentAppIds.length
        ? (() => {
            let query = supabase
              .from('app_daily_sales')
              .select('app_id, metric_date, orders, total_sales_rial')
              .gte('metric_date', dateWindow.start)
              .lte('metric_date', dateWindow.end)
              .order('metric_date', { ascending: true })

            query = paymentAppIds.length === 1
              ? query.eq('app_id', paymentAppIds[0])
              : query.in('app_id', paymentAppIds)

            return query
          })()
        : Promise.resolve({ data: [], error: null })

      const [installResult, salesResult] = await Promise.all([installQuery, salesPromise])

      if (installResult.error || salesResult.error) {
        setErrorMessage('دریافت آمار انجام نشد. دوباره تلاش کنید.')
        setInstallRows([])
        setSalesRows([])
      } else {
        setInstallRows((installResult.data || []) as Array<InstallMetric & { app_id?: string }>)
        setSalesRows((salesResult.data || []) as Array<SalesMetric & { app_id?: string }>)
      }

      setLoading(false)
    }

    void load()
  }, [selectedAppId, dateWindow, paymentEnabled, publishedApps, supabase])

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
        <h2 className="mt-5 text-xl font-bold">بخش مالی به‌زودی اضافه می‌شود</h2>
        <p className="mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
          اطلاعات فروش، تراکنش‌ها، تسویه‌حساب و گزارش‌های مالی به‌زودی در پنل توسعه‌دهندگان نت‌استور در دسترس قرار می‌گیرند.
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

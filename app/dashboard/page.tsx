'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, FileText, HelpCircle, Megaphone, Package, Pencil, Plus, Search, Ticket, UserRound, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/components/store-provider'
import { toFa } from '@/lib/format'
import { BANNER_SLOTS, INSTALL_CAMPAIGN_CONFIG } from '@/lib/monetization'

const tabs = [
  { id: 'apps', label: 'داشبورد من', icon: Package },
  { id: 'account', label: 'اطلاعات حساب کاربری', icon: UserRound },
  { id: 'finance', label: 'مالی', icon: Wallet },
  { id: 'growth', label: 'تبلیغات و رشد', icon: Megaphone },
  { id: 'support', label: 'پشتیبانی و تیکت', icon: HelpCircle },
] as const

type Tab = (typeof tabs)[number]['id']

export default function DashboardPage() {
  const { user, myApps, removeApp, tickets, addTicket } = useStore()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('apps')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => { if (!user) router.replace('/login?next=/dashboard') }, [user, router])
  if (!user) return null
  const currentUser = user

  const myTickets = tickets.filter((ticket) => ticket.developer === currentUser.name)

  async function submitTicket(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    await addTicket({ subject: subject.trim(), message: message.trim(), status: 'open' })
    setSubject(''); setMessage('')
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-bold tracking-tight">پنل توسعه‌دهنده</h1><p className="mt-1 text-sm text-muted-foreground">{user.name}، مدیریت اپ‌ها و ارتباط با نت‌استور</p></div>
        <Button render={<Link href="/upload" />} className="gap-1.5"><Plus className="size-4" />انتشار اپ جدید</Button>
      </div>

      <div className="mt-8 grid gap-2 rounded-2xl border border-border bg-card p-2 sm:grid-cols-5">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${tab === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}><Icon className="size-4" />{label}</button>)}
      </div>

      {tab === 'apps' && <AppsTab myApps={myApps} removeApp={removeApp} />}
      {tab === 'account' && <AccountTab user={user} />}
      {tab === 'finance' && <FinanceTab />}
      {tab === 'growth' && <GrowthTab myApps={myApps} />}
      {tab === 'support' && <SupportTab subject={subject} message={message} setSubject={setSubject} setMessage={setMessage} submitTicket={submitTicket} tickets={myTickets} />}
    </main>
  )
}

function AppsTab({ myApps, removeApp }: { myApps: ReturnType<typeof useStore>['myApps']; removeApp: (id: string) => Promise<void> }) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'published' | 'rejected'>('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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

      {filteredApps.length ? (
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
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button render={<Link href={`/dashboard/edit/${app.id}`} />} size="sm" variant="outline" className="gap-1"><Pencil className="size-4" />ویرایش اطلاعات</Button>
                    {app.status === 'published' && <Button render={<Link href={`/dashboard/version/${app.id}`} />} size="sm" className="gap-1"><Plus className="size-4" />نسخه جدید</Button>}
                    {app.status === 'rejected' && <Button render={<Link href={`/dashboard/edit/${app.id}`} />} size="sm" className="gap-1">اصلاح و ارسال مجدد</Button>}
                    {canDelete && <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(app.id)} className="text-destructive">حذف</Button>}
                  </div>
                </div>

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

function AccountTab({ user }: { user: NonNullable<ReturnType<typeof useStore>['user']> }) { return <section className="mt-8 max-w-2xl rounded-2xl border border-border bg-card p-6"><div className="mb-6 flex items-center gap-3"><UserRound className="size-5 text-primary" /><div><h2 className="font-bold">اطلاعات حساب کاربری</h2><p className="text-sm text-muted-foreground">اطلاعات ثبت‌شده توسعه‌دهنده</p></div></div><div className="grid gap-5 sm:grid-cols-2"><ReadOnly label="نام یا سازمان" value={user.name} /><ReadOnly label="ایمیل" value={user.email} /><ReadOnly label="شماره تلفن" value={user.phone || 'ثبت نشده'} /><ReadOnly label="کد ملی" value={user.nationalId || 'ثبت نشده'} /></div></section> }
function ReadOnly({ label, value }: { label: string; value: string }) { return <div><Label>{label}</Label><Input value={value} readOnly className="mt-1.5 bg-secondary/50" /></div> }
function FinanceTab() {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-6">
      <div className="flex items-start gap-3">
        <Wallet className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="font-bold">آمار مالی</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
            این بخش هنوز به داده واقعی پرداخت متصل نشده است. تا زمان اتصال به تراکنش‌های واقعی، عدد تخمینی یا ساختگی نمایش داده نمی‌شود.
          </p>
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
  const [bannerSlotId, setBannerSlotId] = useState('')
  const [bannerMonths, setBannerMonths] = useState(1)

  const pricePerInstall = INSTALL_CAMPAIGN_CONFIG.pricePerInstallToman
  const installTotal = pricePerInstall == null ? null : installCount * pricePerInstall
  const selectedBanner = BANNER_SLOTS.find((slot) => slot.id === bannerSlotId)
  const bannerTotal =
    selectedBanner?.monthlyPriceToman == null
      ? null
      : selectedBanner.monthlyPriceToman * bannerMonths

  const installReady =
    Boolean(installAppId) &&
    installCount >= INSTALL_CAMPAIGN_CONFIG.minInstalls &&
    installCount <= INSTALL_CAMPAIGN_CONFIG.maxInstalls &&
    pricePerInstall != null

  const bannerReady =
    Boolean(bannerAppId) &&
    Boolean(selectedBanner) &&
    bannerMonths >= 1 &&
    selectedBanner?.monthlyPriceToman != null

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
              onChange={(e) => setInstallCount(Number(e.target.value || 0))}
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

          <Button disabled={!installReady}>ادامه به پرداخت</Button>
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
              جایگاه بنر و مدت نمایش را به‌صورت ماهانه انتخاب کنید.
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
            <select
              value={bannerSlotId}
              onChange={(e) => setBannerSlotId(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">انتخاب جایگاه</option>
              {BANNER_SLOTS.map((slot) => <option key={slot.id} value={slot.id}>{slot.title}</option>)}
            </select>
            {selectedBanner && <p className="mt-1.5 text-xs text-muted-foreground">{selectedBanner.description}</p>}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">قیمت ماهانه</p>
              <p className="mt-1 font-bold">
                {selectedBanner?.monthlyPriceToman == null ? 'تعیین نشده' : formatToman(selectedBanner.monthlyPriceToman)}
              </p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">مبلغ کل</p>
              <p className="mt-1 font-bold">{bannerTotal == null ? '—' : formatToman(bannerTotal)}</p>
            </div>
          </div>

          {selectedBanner && selectedBanner.monthlyPriceToman == null && (
            <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
              قیمت ماهانه این جایگاه هنوز در تنظیمات نت‌استور وارد نشده است.
            </p>
          )}

          <Button disabled={!bannerReady}>ادامه به پرداخت</Button>
        </div>
      </div>
    </section>
  )
}

function SupportTab({ subject, message, setSubject, setMessage, submitTicket, tickets }: { subject: string; message: string; setSubject: (v: string) => void; setMessage: (v: string) => void; submitTicket: (e: React.FormEvent) => void; tickets: ReturnType<typeof useStore>['tickets'] }) { return <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"><form onSubmit={submitTicket} className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><FileText className="size-5 text-primary" /><div><h2 className="font-bold">ارسال تیکت جدید</h2><p className="text-sm text-muted-foreground">پیام شما به تیم نت‌استور ارسال می‌شود</p></div></div><div className="mt-6 flex flex-col gap-4"><div><Label htmlFor="ticket-subject">موضوع</Label><Input id="ticket-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="مثلاً مشکل در انتشار نسخه جدید" className="mt-1.5" /></div><div><Label htmlFor="ticket-message">توضیحات</Label><Textarea id="ticket-message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="مشکل یا درخواست خود را توضیح دهید..." className="mt-1.5 min-h-32" /></div><Button type="submit" className="gap-2"><Ticket className="size-4" />ارسال به تیم پشتیبانی</Button></div></form><div className="rounded-2xl border border-border bg-card p-6"><h2 className="font-bold">تیکت‌های من</h2><div className="mt-4 flex flex-col gap-3">{tickets.length ? tickets.map((ticket) => <div key={ticket.id} className="rounded-xl border border-border p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-medium">{ticket.subject}</h3><Badge variant={ticket.status === 'open' ? 'secondary' : 'outline'}>{ticket.status === 'open' ? 'در انتظار پاسخ' : ticket.status === 'answered' ? 'پاسخ داده شد' : 'بسته‌شده'}</Badge></div><p className="mt-2 text-sm leading-7 text-muted-foreground">{ticket.message}</p><p className="mt-2 text-xs text-muted-foreground">{ticket.createdAt}</p></div>) : <p className="py-12 text-center text-sm text-muted-foreground">هنوز تیکتی ثبت نکرده‌اید.</p>}</div></div></section> }
function EmptyApps() { return <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center"><Package className="size-8 text-muted-foreground" /><p className="font-medium">هنوز اپی منتشر نکرده‌اید</p><Button render={<Link href="/upload" />} className="gap-1"><Plus className="size-4" />انتشار اولین اپ</Button></div> }
function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) { return <div className="rounded-2xl border border-border bg-card p-5"><span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span><p className="mt-3 text-2xl font-bold">{value}</p><p className="mt-0.5 text-xs text-muted-foreground">{label}</p></div> }

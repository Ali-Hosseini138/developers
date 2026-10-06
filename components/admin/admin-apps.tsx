'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  FileArchive,
  Filter,
  ImageIcon,
  Search,
  ShieldCheck,
} from 'lucide-react'
import type { AdminApp, ReviewSubmission, Version } from '@/app/admin/page'
import { updateAppStatusAction, updateVersionStatusAction } from '@/app/admin/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending: 'در انتظار بررسی',
  published: 'منتشر شده',
  rejected: 'رد شده',
}

const snapshotLabels: Record<string, string> = {
  name: 'عنوان',
  tagline: 'توضیح کوتاه',
  description: 'توضیحات',
  category: 'دسته‌بندی',
  age_restriction: 'رده سنی',
  package_name: 'پکیج‌نیم',
  website: 'وب‌سایت',
  support_email: 'ایمیل پشتیبانی',
  apk_path: 'فایل APK',
  apk_name: 'نام APK',
  apk_size: 'حجم APK',
  icon_path: 'آیکون',
  banner_path: 'بنر',
  screenshot_paths: 'اسکرین‌شات‌ها',
  has_in_app_payment: 'داشتن پرداخت',
  netbox_payment_integrated: 'Netbox Payment',
  developed_for_android_tv: 'توسعه برای Android TV',
  air_mouse_compatible: 'سازگاری با ایرماوس',
}

function adminFile(pathname: string | null) {
  return pathname ? `/api/admin/file?pathname=${encodeURIComponent(pathname)}` : null
}

function faDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function requestAge(value: string) {
  const diff = Date.now() - new Date(value).getTime()
  const hours = Math.max(0, Math.floor(diff / 36e5))
  if (hours < 24) return `${hours.toLocaleString('fa-IR')} ساعت`
  return `${Math.floor(hours / 24).toLocaleString('fa-IR')} روز`
}

function stable(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify([...value].sort())
  if (value && typeof value === 'object') return JSON.stringify(value)
  return String(value ?? '')
}

function getChanges(current?: ReviewSubmission, previous?: ReviewSubmission) {
  if (!current) return []
  if (!previous) return [{ key: 'new', label: 'اولین ارسال این اپ' }]
  const keys = Object.keys(current.snapshot || {})
  return keys
    .filter((key) => stable(current.snapshot?.[key]) !== stable(previous.snapshot?.[key]))
    .map((key) => ({ key, label: snapshotLabels[key] || key }))
}

function yesNo(value: boolean) {
  return value ? 'بله' : 'خیر'
}

export function AdminApps({ apps }: { apps: AdminApp[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'queue' | 'all' | 'pending-apps' | 'pending-versions' | 'rejected' | 'published'>('queue')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filteredApps = useMemo(() => {
    const q = query.trim().toLowerCase()
    return apps.filter((app) => {
      const hasPendingVersion = app.versions.some((version) => version.status === 'pending')
      const matchesFilter =
        filter === 'all' ||
        (filter === 'queue' && (app.status === 'pending' || hasPendingVersion)) ||
        (filter === 'pending-apps' && app.status === 'pending') ||
        (filter === 'pending-versions' && hasPendingVersion) ||
        (filter === 'rejected' && app.status === 'rejected') ||
        (filter === 'published' && app.status === 'published')

      const matchesQuery =
        !q ||
        app.name.toLowerCase().includes(q) ||
        app.package_name?.toLowerCase().includes(q) ||
        app.developer.toLowerCase().includes(q) ||
        app.developer_email?.toLowerCase().includes(q)

      return matchesFilter && matchesQuery
    })
  }, [apps, filter, query])

  if (apps.length === 0) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">هنوز اپلیکیشنی ثبت نشده است.</div>
  }

  return (
    <section>
      <div className="mb-5 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 xl:max-w-md">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو: نام اپ، پکیج‌نیم، توسعه‌دهنده..."
              className="pr-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[
              ['queue', 'صف بررسی'],
              ['pending-apps', 'اپ‌های جدید'],
              ['pending-versions', 'نسخه‌های جدید'],
              ['rejected', 'رد شده'],
              ['published', 'منتشر شده'],
              ['all', 'همه'],
            ].map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={filter === id ? 'default' : 'outline'}
                onClick={() => setFilter(id as typeof filter)}
                className="shrink-0"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filteredApps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          موردی با این فیلتر پیدا نشد.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredApps.map((app) => (
            <AppReviewCard
              key={app.id}
              app={app}
              expanded={expanded === app.id}
              onToggle={() => setExpanded((value) => value === app.id ? null : app.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function AppReviewCard({ app, expanded, onToggle }: { app: AdminApp; expanded: boolean; onToggle: () => void }) {
  const icon = adminFile(app.icon_path)
  const appSubmissions = app.submissions.filter((item) => item.request_type === 'app')
  const currentSubmission = appSubmissions.find((item) => item.status === 'pending') || appSubmissions[0]
  const currentIndex = currentSubmission ? appSubmissions.findIndex((item) => item.id === currentSubmission.id) : -1
  const previousSubmission = currentIndex >= 0 ? appSubmissions[currentIndex + 1] : undefined
  const changes = getChanges(currentSubmission, previousSubmission)
  const pendingVersions = app.versions.filter((version) => version.status === 'pending')
  const isNewRequest = currentSubmission && !previousSubmission
  const needsAttention = app.status === 'pending' || pendingVersions.length > 0

  return (
    <article className={`overflow-hidden rounded-2xl border bg-card ${needsAttention ? 'border-primary/35' : 'border-border'}`}>
      <div className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
              {icon ? <Image src={icon} alt={`آیکون ${app.name}`} fill sizes="64px" className="object-cover" unoptimized /> : <span className="flex h-full items-center justify-center text-xs text-muted-foreground">بدون آیکون</span>}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold">{app.name}</h2>
                <Badge variant={app.status === 'pending' ? 'default' : 'outline'}>{statusLabels[app.status] || app.status}</Badge>
                {app.status === 'pending' && (
                  <Badge variant="secondary">{isNewRequest ? 'اپ جدید' : 'ارسال مجدد'}</Badge>
                )}
                {pendingVersions.length > 0 && <Badge variant="secondary">{pendingVersions.length.toLocaleString('fa-IR')} نسخه جدید</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{app.tagline || 'بدون توضیح کوتاه'}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                <span>توسعه‌دهنده: <strong className="text-foreground">{app.developer}</strong></span>
                {app.developer_email && <span dir="ltr">{app.developer_email}</span>}
                {app.package_name && <span dir="ltr">{app.package_name}</span>}
                <span>آخرین تغییر: {faDateTime(app.updated_at)}</span>
                {currentSubmission?.submitted_at && <span>در صف: {requestAge(currentSubmission.submitted_at)}</span>}
              </div>

              {app.status === 'pending' && changes.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-muted-foreground">تغییرات این درخواست:</span>
                  {changes.slice(0, 6).map((change) => (
                    <span key={change.key} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">{change.label}</span>
                  ))}
                  {changes.length > 6 && <span className="text-xs text-muted-foreground">+{(changes.length - 6).toLocaleString('fa-IR')} مورد</span>}
                </div>
              )}
            </div>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={onToggle} className="gap-2">
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? 'بستن جزئیات' : 'بررسی جزئیات'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border bg-muted/20 p-5">
          <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="flex flex-col gap-6">
              <ReviewFacts app={app} />
              <MediaReview app={app} />
              {app.status === 'pending' && <ChangesPanel current={currentSubmission} previous={previousSubmission} />}
              <VersionsPanel app={app} />
              <ReviewHistory submissions={app.submissions} />
            </div>

            <aside className="flex flex-col gap-5">
              {app.status === 'pending' && (
                <DecisionPanel type="app" id={app.id} />
              )}
              {app.review_reason && app.status === 'rejected' && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <p className="text-sm font-semibold text-destructive">دلیل آخرین رد</p>
                  <p className="mt-2 text-sm leading-7">{app.review_reason}</p>
                </div>
              )}
              <QuickChecklist app={app} />
            </aside>
          </div>
        </div>
      )}
    </article>
  )
}

function ReviewFacts({ app }: { app: AdminApp }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">اطلاعات درخواست</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Fact label="عنوان" value={app.name} />
        <Fact label="دسته‌بندی" value={app.category || '—'} />
        <Fact label="پکیج‌نیم" value={app.package_name || '—'} ltr />
        <Fact label="رده سنی" value={app.age_restriction || '—'} />
        <Fact label="پرداخت درون‌برنامه‌ای" value={yesNo(app.has_in_app_payment)} />
        <Fact label="Netbox Payment" value={app.has_in_app_payment ? (app.netbox_payment_integrated ? 'پیاده‌سازی شده' : 'پیاده‌سازی نشده') : 'نیاز ندارد'} />
        <Fact label="مخصوص Android TV" value={yesNo(app.developed_for_android_tv)} />
        <Fact label="سازگار با ایرماوس" value={app.developed_for_android_tv ? 'نیاز ندارد' : yesNo(app.air_mouse_compatible)} />
        <Fact label="ایمیل پشتیبانی" value={app.support_email || '—'} ltr />
        <Fact label="وب‌سایت" value={app.website || '—'} ltr />
      </div>
      <div className="mt-4">
        <p className="text-xs text-muted-foreground">توضیحات</p>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-secondary/50 p-3 text-sm leading-7">{app.description || 'بدون توضیحات'}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {app.apk_path && <FileLink path={app.apk_path} label={app.apk_name || 'دانلود APK'} />}
        {app.apk_size != null && <span className="rounded-lg bg-secondary px-3 py-2 text-xs">{(app.apk_size / 1024 / 1024).toFixed(1)} MB</span>}
      </div>
    </section>
  )
}

function MediaReview({ app }: { app: AdminApp }) {
  const banner = adminFile(app.banner_path)
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2"><ImageIcon className="size-4 text-primary" /><h3 className="font-bold">رسانه‌ها</h3></div>
      {banner && (
        <div className="relative mt-4 aspect-video overflow-hidden rounded-xl border border-border">
          <Image src={banner} alt="بنر اپ" fill className="object-cover" unoptimized />
        </div>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {app.screenshot_paths.map((path, index) => {
          const src = adminFile(path)
          if (!src) return null
          return <a key={path} href={src} target="_blank" rel="noreferrer" className="relative aspect-video overflow-hidden rounded-lg border border-border"><Image src={src} alt={`اسکرین‌شات ${index + 1}`} fill className="object-cover" unoptimized /></a>
        })}
      </div>
      {app.screenshot_paths.length === 0 && <p className="mt-4 text-sm text-muted-foreground">اسکرین‌شاتی ثبت نشده است.</p>}
    </section>
  )
}

function ChangesPanel({ current, previous }: { current?: ReviewSubmission; previous?: ReviewSubmission }) {
  const changes = getChanges(current, previous)
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">چه چیزی در این درخواست تغییر کرده؟</h3>
      {!previous ? (
        <p className="mt-3 text-sm text-muted-foreground">این اولین ارسال اپ است؛ همه اطلاعات برای اولین بار بررسی می‌شوند.</p>
      ) : changes.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">تغییر قابل تشخیصی نسبت به ارسال قبلی ثبت نشده است.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {changes.map(({ key, label }) => (
            <div key={key} className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold">{label}</p>
              <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                <div className="rounded-md bg-destructive/5 p-2"><span className="text-muted-foreground">قبلی:</span> {displaySnapshotValue(previous.snapshot?.[key])}</div>
                <div className="rounded-md bg-primary/5 p-2"><span className="text-muted-foreground">جدید:</span> {displaySnapshotValue(current?.snapshot?.[key])}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function VersionsPanel({ app }: { app: AdminApp }) {
  if (app.versions.length === 0) return null
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-bold">نسخه‌های ارسالی</h3>
      <div className="mt-4 flex flex-col gap-3">
        {app.versions.map((version, index) => (
          <VersionRow key={version.id} version={version} previous={app.versions[index + 1]} />
        ))}
      </div>
    </section>
  )
}

function VersionRow({ version, previous }: { version: Version; previous?: Version }) {
  const apkChanged = Boolean(previous && version.apk_path !== previous.apk_path)
  const packageChanged = Boolean(previous && version.package_name !== previous.package_name)
  return (
    <div className={`rounded-xl border p-4 ${version.status === 'pending' ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{version.apk_name || 'نسخه بدون نام فایل'}</span>
            <Badge variant={version.status === 'pending' ? 'default' : 'outline'}>{statusLabels[version.status] || version.status}</Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{faDateTime(version.created_at)}</p>
          {version.changelog && <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{version.changelog}</p>}
          {previous && (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {apkChanged && <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">APK جدید</span>}
              {packageChanged && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700">پکیج‌نیم تغییر کرده</span>}
              <span className="rounded-full bg-secondary px-2 py-1">توضیحات نسخه جدید</span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {version.apk_path && <FileLink path={version.apk_path} label="دانلود APK" />}
        </div>
      </div>
      {version.status === 'pending' && <div className="mt-4"><DecisionPanel type="version" id={version.id} compact /></div>}
      {version.review_reason && version.status === 'rejected' && <p className="mt-3 rounded-lg bg-destructive/5 p-3 text-sm">دلیل رد: {version.review_reason}</p>}
    </div>
  )
}

function DecisionPanel({ type, id, compact = false }: { type: 'app' | 'version'; id: string; compact?: boolean }) {
  const action = type === 'app' ? updateAppStatusAction : updateVersionStatusAction
  const idName = type === 'app' ? 'appId' : 'versionId'

  return (
    <div className={compact ? '' : 'rounded-xl border border-border bg-card p-5'}>
      {!compact && <h3 className="font-bold">تصمیم بررسی</h3>}
      <form action={action} className="mt-3">
        <input type="hidden" name={idName} value={id} />
        <input type="hidden" name="status" value="published" />
        <Button type="submit" className="w-full gap-2"><ShieldCheck className="size-4" />تأیید و انتشار</Button>
      </form>
      <form action={action} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name={idName} value={id} />
        <input type="hidden" name="status" value="rejected" />
        <Textarea name="reason" required minLength={5} placeholder="دلیل رد را دقیق بنویسید؛ این متن برای توسعه‌دهنده قابل نمایش است." className="min-h-24" />
        <Button type="submit" variant="outline" className="border-destructive/40 text-destructive hover:text-destructive">رد و ارسال دلیل</Button>
      </form>
    </div>
  )
}

function QuickChecklist({ app }: { app: AdminApp }) {
  const checks = [
    ['APK موجود است', Boolean(app.apk_path)],
    ['پکیج‌نیم ثبت شده', Boolean(app.package_name)],
    ['آیکون موجود است', Boolean(app.icon_path)],
    ['بنر موجود است', Boolean(app.banner_path)],
    ['حداقل یک اسکرین‌شات', app.screenshot_paths.length > 0],
    ['ایمیل پشتیبانی', Boolean(app.support_email)],
    ['شرط TV / ایرماوس', app.developed_for_android_tv || app.air_mouse_compatible],
    ['شرط Payment', !app.has_in_app_payment || app.netbox_payment_integrated],
  ] as const

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2"><Filter className="size-4 text-primary" /><h3 className="font-bold">چک‌لیست سریع</h3></div>
      <div className="mt-4 flex flex-col gap-2">
        {checks.map(([label, ok]) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <span>{label}</span>
            <span className={ok ? 'text-primary' : 'text-destructive'}>{ok ? '✓' : '✕'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ReviewHistory({ submissions }: { submissions: ReviewSubmission[] }) {
  if (submissions.length === 0) return null
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2"><Clock3 className="size-4 text-primary" /><h3 className="font-bold">تاریخچه ارسال و بررسی</h3></div>
      <div className="mt-4 flex flex-col gap-3">
        {submissions.map((submission, index) => (
          <div key={submission.id} className="flex gap-3 border-r-2 border-border pr-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{submission.request_type === 'version' ? 'نسخه جدید' : index === submissions.length - 1 ? 'اولین ارسال' : 'ارسال مجدد اپ'}</span>
                <Badge variant="outline">{statusLabels[submission.status] || submission.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">ارسال: {faDateTime(submission.submitted_at)}{submission.reviewed_at ? ` · بررسی: ${faDateTime(submission.reviewed_at)}` : ''}</p>
              {submission.rejection_reason && <p className="mt-2 text-sm text-destructive">{submission.rejection_reason}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function FileLink({ path, label }: { path: string; label: string }) {
  const href = adminFile(path)
  if (!href) return null
  return (
    <a href={href} className="inline-flex items-center gap-2 rounded-lg border border-input px-3 py-2 text-xs font-medium hover:bg-secondary">
      <Download className="size-3.5" />
      {label}
    </a>
  )
}

function Fact({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="rounded-lg bg-secondary/50 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium" dir={ltr ? 'ltr' : undefined}>{value}</p></div>
}

function displaySnapshotValue(value: unknown) {
  if (Array.isArray(value)) return value.length ? `${value.length.toLocaleString('fa-IR')} مورد` : 'خالی'
  if (typeof value === 'boolean') return value ? 'بله' : 'خیر'
  if (value == null || value === '') return 'خالی'
  const text = String(value)
  if (text.length > 160) return `${text.slice(0, 160)}…`
  if (text.includes('/')) return 'تغییر فایل'
  return text
}

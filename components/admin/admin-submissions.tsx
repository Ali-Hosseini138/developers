'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Search, ShieldCheck, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { AdminSubmissionDetail, AdminSubmissionListItem } from '@/lib/admin-hub-model'
import { adminSubmissionKindLabel, adminSubmissionStatusLabel } from '@/lib/admin-hub-model'

function faDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fa-IR')
}

function statusVariant(status: AdminSubmissionListItem['status']): 'default' | 'secondary' | 'outline' {
  if (status === 'approved') return 'default'
  if (status === 'pending_review' || status === 'uploaded' || status === 'parsing') return 'secondary'
  return 'outline'
}

function errorMessage(payload: any, fallback: string) {
  if (payload?.message && Array.isArray(payload?.problems) && payload.problems.length) {
    return String(payload.message) + ' ' + payload.problems.join(' — ')
  }
  if (payload?.message) return String(payload.message)
  if (payload?.detail) return String(payload.detail)
  if (Array.isArray(payload?.problems) && payload.problems.length) return payload.problems.join(' — ')
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload)) {
      if (key === 'statusCode') continue
      if (Array.isArray(value) && value.length) return String(value[0])
    }
  }
  return fallback
}

export function AdminSubmissions({
  submissions,
  canReviewSubmission,
}: {
  submissions: AdminSubmissionListItem[]
  canReviewSubmission: boolean
}) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | AdminSubmissionListItem['status']>('pending_review')
  const [kind, setKind] = useState<'all' | 'new' | 'update'>('all')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [details, setDetails] = useState<Record<number, AdminSubmissionDetail>>({})
  const [loadingId, setLoadingId] = useState<number | null>(null)
  const [loadError, setLoadError] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return submissions.filter((item) => {
      const statusOk = status === 'all' || item.status === status
      const kindOk = kind === 'all' || item.kind === kind
      const searchOk =
        !q ||
        item.app.name.toLowerCase().includes(q) ||
        item.app.packageName.toLowerCase().includes(q) ||
        item.developer.name.toLowerCase().includes(q)
      return statusOk && kindOk && searchOk
    })
  }, [submissions, query, status, kind])

  async function toggle(item: AdminSubmissionListItem) {
    if (expandedId === item.id) {
      setExpandedId(null)
      return
    }

    setExpandedId(item.id)
    setLoadError('')
    if (details[item.id]) return

    setLoadingId(item.id)
    try {
      const response = await fetch(`/api/admin-hub/submissions/${item.id}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(errorMessage(payload, 'دریافت جزئیات درخواست انجام نشد.'))
      setDetails((current) => ({ ...current, [item.id]: payload }))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'دریافت جزئیات انجام نشد.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="جستجو در نام اپلیکیشن، Package Name یا توسعه‌دهنده..."
              className="pr-9"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="pending_review">در انتظار بررسی</option>
            <option value="uploaded">بارگذاری شده</option>
            <option value="parsing">در حال پردازش</option>
            <option value="parse_failed">خطای فایل</option>
            <option value="approved">منتشر شده</option>
            <option value="rejected">رد شده</option>
            <option value="cancelled">لغو شده</option>
            <option value="all">همه وضعیت‌ها</option>
          </select>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">همه درخواست‌ها</option>
            <option value="new">انتشار اولیه</option>
            <option value="update">به‌روزرسانی</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          درخواستی با این فیلتر پیدا نشد.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((item) => {
            const expanded = expandedId === item.id
            const detail = details[item.id]
            return (
              <article key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="p-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-bold">{item.app.name}</h2>
                        <Badge variant={statusVariant(item.status)}>{adminSubmissionStatusLabel(item.status)}</Badge>
                        <Badge variant="outline">{adminSubmissionKindLabel(item.kind)}</Badge>
                        {item.hasWarnings && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <AlertTriangle className="size-3.5" /> {item.warningCount.toLocaleString('fa-IR')} هشدار
                          </span>
                        )}
                        {item.hasErrors && (
                          <span className="inline-flex items-center gap-1 text-xs text-destructive">
                            <XCircle className="size-3.5" /> {item.errorCount.toLocaleString('fa-IR')} خطا
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                        <span dir="ltr">{item.app.packageName}</span>
                        <span>توسعه‌دهنده: {item.developer.name}</span>
                        <span>ارسال: {faDate(item.submittedAt)}</span>
                        {item.versionName && <span>نسخه: <span dir="ltr">{item.versionName}</span></span>}
                        {item.versionCode != null && <span>versionCode: {item.versionCode.toLocaleString('fa-IR')}</span>}
                      </div>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => void toggle(item)} className="gap-2">
                      {loadingId === item.id ? <Loader2 className="size-4 animate-spin" /> : expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                      {expanded ? 'بستن جزئیات' : 'بررسی جزئیات'}
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-border bg-muted/20 p-5">
                    {loadingId === item.id && !detail ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">در حال دریافت جزئیات...</div>
                    ) : loadError && !detail ? (
                      <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{loadError}</p>
                    ) : detail ? (
                      <SubmissionDetailView detail={detail} canReviewSubmission={canReviewSubmission} />
                    ) : null}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}

function SubmissionDetailView({
  detail,
  canReviewSubmission,
}: {
  detail: AdminSubmissionDetail
  canReviewSubmission: boolean
}) {
  const [clientVariation, setClientVariation] = useState('')
  const [netboxUserOnly, setNetboxUserOnly] = useState(false)
  const [iconSource, setIconSource] = useState(
    detail.kind === 'new' && detail.icons.availableSources.length === 1 ? detail.icons.availableSources[0] : '',
  )
  const [createUnknownPermissions, setCreateUnknownPermissions] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const [actionError, setActionError] = useState('')

  const canApprove =
    canReviewSubmission &&
    detail.canDecide &&
    Boolean(clientVariation) &&
    (detail.kind !== 'new' || Boolean(iconSource))

  async function decide(action: 'approve' | 'reject') {
    if (busy) return
    setBusy(action)
    setActionError('')

    try {
      const body = action === 'approve'
        ? {
            clientVariation,
            netboxUserOnly,
            ...(detail.kind === 'new' ? { iconSource } : {}),
            createUnknownPermissions,
          }
        : { reason: reason.trim() }

      const response = await fetch(`/api/admin-hub/submissions/${detail.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(errorMessage(payload, action === 'approve' ? 'تأیید انجام نشد.' : 'رد درخواست انجام نشد.'))
      window.location.reload()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'عملیات انجام نشد.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="flex flex-col gap-5">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-bold">اطلاعات اپلیکیشن</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Fact label="عنوان" value={detail.app.name} />
            <Fact label="عنوان انگلیسی" value={detail.app.nameEn || '—'} />
            <Fact label="Package Name" value={detail.app.packageName} ltr />
            <Fact label="دسته‌بندی" value={`${detail.app.category.name} (#${detail.app.category.id})`} />
            <Fact label="نوع" value={detail.app.applicationType === 2 ? 'بازی' : 'برنامه'} />
            <Fact label="محدودیت سنی" value={String(detail.app.ageLimit)} />
            <Fact label="Netbox Payment" value={detail.app.supportsNetboxPayment ? 'پشتیبانی می‌کند' : 'پشتیبانی نمی‌کند'} />
            <Fact label="توسعه‌دهنده" value={detail.developer.name} />
            <Fact label="ایمیل توسعه‌دهنده" value={detail.developer.email} ltr />
            <Fact label="نوع حساب" value={detail.developer.accountType === 'legal' ? 'حقوقی' : 'حقیقی'} />
            <Fact label="شرکت" value={detail.developer.companyName || '—'} />
            <Fact label="عضویت توسعه‌دهنده" value={faDate(detail.developer.dateJoined)} />
            <Fact label="وضعیت حساب" value={detail.developer.isActive ? 'فعال' : 'غیرفعال'} />
            {detail.publishedApplication && <Fact label="اپلیکیشن فعلی استور" value={detail.publishedApplication.name + ' · ' + detail.publishedApplication.packageName} />}
          </div>
          {!detail.app.category.isValid && (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800">
              دسته‌بندی این درخواست دیگر معتبر نیست؛ تأیید ممکن است در Recheck شکست بخورد.
            </p>
          )}
          <div className="mt-4 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">توضیح کوتاه</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{detail.app.shortDescription || '—'}</p>
          </div>
          <div className="mt-3 rounded-lg bg-secondary/50 p-3">
            <p className="text-xs text-muted-foreground">توضیحات کامل</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{detail.app.longDescription || '—'}</p>
          </div>
          {detail.changeLog && (
            <div className="mt-3 rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">تغییرات نسخه</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{detail.changeLog}</p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-bold">رسانه‌ها و آیکون‌ها</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {detail.app.bannerUrl && <MediaImage label="بنر" src={detail.app.bannerUrl} />}
            {detail.app.backgroundImageUrl && <MediaImage label="تصویر پس‌زمینه" src={detail.app.backgroundImageUrl} />}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {detail.icons.userIconUrl && <MediaImage label="آیکون توسعه‌دهنده" src={detail.icons.userIconUrl} square />}
            {detail.icons.extractedIconUrl && <MediaImage label="آیکون استخراج‌شده" src={detail.icons.extractedIconUrl} square />}
            {detail.icons.currentStoreIconUrl && <MediaImage label="آیکون فعلی استور" src={detail.icons.currentStoreIconUrl} square />}
          </div>
          {detail.app.screenshots.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {detail.app.screenshots.slice().sort((a, b) => a.weight - b.weight).map((shot, index) => (
                <a key={shot.id} href={shot.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-border">
                  <img src={shot.url} alt={`اسکرین‌شات ${index + 1}`} className="aspect-video w-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-bold">گزارش پردازش APK</h3>
          {detail.parseReport ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Fact label="Package Name فایل" value={detail.parseReport.packageName} ltr />
              <Fact label="Version Name" value={detail.parseReport.versionName} ltr />
              <Fact label="Version Code" value={String(detail.parseReport.versionCode)} />
              <Fact label="حجم" value={detail.parseReport.fileSizeDisplay} />
              <Fact label="minSdk" value={String(detail.parseReport.minSdkVersion ?? '—')} />
              <Fact label="targetSdk" value={String(detail.parseReport.targetSdkVersion ?? '—')} />
              <Fact label="معماری‌ها" value={detail.parseReport.architectures.join(', ') || '—'} ltr />
              <Fact label="آخرین versionCode استور" value={detail.currentStoreMaxVersionCode == null ? '—' : String(detail.currentStoreMaxVersionCode)} />
              <Fact label="MD5" value={detail.parseReport.md5Hash || '—'} ltr />
              <Fact label="SHA-256" value={detail.parseReport.sha256Hash || '—'} ltr />
              <Fact label="زمان پردازش" value={faDate(detail.parseReport.parsedAt)} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">گزارش پردازش هنوز آماده نشده است.</p>
          )}
          {detail.parseReport?.publicKey && (
            <div className="mt-3 rounded-lg bg-secondary/50 p-3">
              <p className="text-xs text-muted-foreground">Public Key امضا</p>
              <p className="mt-2 break-all font-mono text-xs" dir="ltr">{detail.parseReport.publicKey}</p>
            </div>
          )}
        </section>

        {(detail.issues.length > 0 || detail.permissions.length > 0) && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-bold">خطاها، هشدارها و Permissionها</h3>
            <div className="mt-4 flex flex-col gap-2">
              {detail.issues.map((issue) => (
                <div key={issue.id} className={`rounded-lg border p-3 text-sm ${issue.severity === 'error' ? 'border-destructive/30 bg-destructive/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                  <span className="font-semibold" dir="ltr">{issue.code}</span>
                  <p className="mt-1 leading-7">{issue.message}</p>
                </div>
              ))}
            </div>
            {detail.permissions.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {detail.permissions.map((permission) => (
                  <span key={permission.name} className={`rounded-full px-2.5 py-1 text-xs ${permission.isUnknown ? 'bg-amber-500/10 text-amber-800' : permission.isNew ? 'bg-primary/10 text-primary' : 'bg-secondary'}`} dir="ltr">
                    {permission.name}{permission.isNew ? ' · NEW' : ''}{permission.isUnknown ? ' · UNKNOWN' : ''}
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {(detail.decisions.length > 0 || detail.otherSubmissions.length > 0) && (
          <section className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-bold">سابقه بررسی</h3>
            <div className="mt-4 flex flex-col gap-3">
              {detail.decisions.map((decision) => (
                <div key={decision.id} className="rounded-lg bg-secondary/50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{decision.decision === 'approved' ? 'تأیید' : 'رد'}</Badge>
                    <span>{decision.reviewerUsername}</span>
                    <span className="text-xs text-muted-foreground">{faDate(decision.decidedAt)}</span>
                  </div>
                  {decision.reason && <p className="mt-2 whitespace-pre-wrap">{decision.reason}</p>}
                </div>
              ))}
              {detail.otherSubmissions.map((submission) => (
                <div key={submission.id} className="rounded-lg border border-border p-3 text-sm">
                  <span>درخواست #{submission.id.toLocaleString('fa-IR')} · {adminSubmissionKindLabel(submission.kind)}</span>
                  <span className="mr-2 text-xs text-muted-foreground">{faDate(submission.submittedAt)}</span>
                  {submission.rejectionReason && <p className="mt-2 text-destructive">{submission.rejectionReason}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="flex flex-col gap-5">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-bold">وضعیت درخواست</h3>
          <div className="mt-3 flex items-center gap-2">
            {detail.status === 'approved' ? <CheckCircle2 className="size-5 text-primary" /> : detail.status === 'rejected' || detail.status === 'parse_failed' ? <XCircle className="size-5 text-destructive" /> : <ShieldCheck className="size-5 text-primary" />}
            <span>{adminSubmissionStatusLabel(detail.status)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">ارسال: {faDate(detail.submittedAt)}</p>
        </section>

        {detail.canDecide && canReviewSubmission && (
          <section className="rounded-xl border border-primary/25 bg-card p-5">
            <h3 className="font-bold">تأیید و انتشار</h3>
            <div className="mt-4 flex flex-col gap-3">
              <div>
                <label className="text-sm font-medium">Client Variation</label>
                <select
                  value={clientVariation}
                  onChange={(event) => setClientVariation(event.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="ALL">همه کلاینت‌ها</option>
                  <option value="NETBOX">فقط نت‌استور نت‌باکس</option>
                  <option value="GENERAL">فقط نت‌استور عمومی</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={netboxUserOnly} onChange={(event) => setNetboxUserOnly(event.target.checked)} />
                فقط کاربران نت‌باکس
              </label>

              {detail.kind === 'new' && (
                <div>
                  <label className="text-sm font-medium">منبع آیکون</label>
                  <select
                    value={iconSource}
                    onChange={(event) => setIconSource(event.target.value)}
                    className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">انتخاب کنید</option>
                    {detail.icons.availableSources.map((source) => (
                      <option key={source} value={source}>{source === 'USER' ? 'آیکون توسعه‌دهنده' : 'آیکون استخراج‌شده از APK'}</option>
                    ))}
                  </select>
                  {detail.icons.availableSources.length === 0 && (
                    <p className="mt-2 text-xs text-destructive">هیچ آیکونی برای تأیید انتشار اولیه موجود نیست.</p>
                  )}
                </div>
              )}

              {detail.hasUnknownPermissions && (
                <label className="flex items-start gap-2 text-sm leading-6">
                  <input type="checkbox" checked={createUnknownPermissions} onChange={(event) => setCreateUnknownPermissions(event.target.checked)} className="mt-1" />
                  Permissionهای ناشناخته در استور ساخته و به اپلیکیشن متصل شوند:
                  <span className="block text-xs text-muted-foreground" dir="ltr">
                    {detail.permissions.filter((permission) => permission.isUnknown).map((permission) => permission.name).join(', ')}
                  </span>
                </label>
              )}

              <Button type="button" disabled={!canApprove || busy !== null} onClick={() => void decide('approve')} className="gap-2">
                {busy === 'approve' && <Loader2 className="size-4 animate-spin" />}
                تأیید و انتشار
              </Button>
            </div>
          </section>
        )}

        {detail.canDecide && canReviewSubmission && (
          <section className="rounded-xl border border-destructive/25 bg-card p-5">
            <h3 className="font-bold">رد درخواست</h3>
            <Textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
              placeholder="دلیل رد را دقیق بنویسید؛ همین متن به توسعه‌دهنده نمایش داده می‌شود."
              className="mt-3 min-h-28"
            />
            <Button
              type="button"
              variant="outline"
              disabled={reason.trim().length === 0 || busy !== null}
              onClick={() => void decide('reject')}
              className="mt-3 w-full border-destructive/40 text-destructive hover:text-destructive"
            >
              {busy === 'reject' && <Loader2 className="size-4 animate-spin" />}
              رد درخواست
            </Button>
          </section>
        )}

        {actionError && (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm leading-7 text-destructive">
            {actionError}
          </p>
        )}
      </aside>
    </div>
  )
}

function Fact({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium" dir={ltr ? 'ltr' : undefined}>{value}</p>
    </div>
  )
}

function MediaImage({ label, src, square = false }: { label: string; src: string; square?: boolean }) {
  return (
    <a href={src} target="_blank" rel="noreferrer" className="block">
      <p className="mb-2 text-xs text-muted-foreground">{label}</p>
      <img
        src={src}
        alt={label}
        className={`w-full rounded-xl border border-border object-cover ${square ? 'aspect-square' : 'aspect-video'}`}
      />
    </a>
  )
}

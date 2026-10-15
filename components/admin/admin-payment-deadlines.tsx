'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { paymentDate, paymentStatusLabels, sortPaymentDeadlines, type PaymentDeadlineItem } from '@/lib/payment-deadline'

export function AdminPaymentDeadlines() {
  const [items, setItems] = useState<PaymentDeadlineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const acting = useRef(false)
  const sorted = useMemo(() => sortPaymentDeadlines(items), [items])

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin-hub/payment-deadlines', { cache: 'no-store', signal })
      const payload = await response.json().catch(() => null)
      if (response.status === 401) { window.location.assign('/admin/login'); return }
      if (!response.ok) throw new Error(response.status >= 500 ? 'سرویس مهلت پرداخت موقتاً در دسترس نیست. بعداً دوباره تلاش کنید.' : payload?.detail || 'دریافت صف مهلت پرداخت انجام نشد.')
      if (!Array.isArray(payload)) throw new Error('پاسخ صف مهلت پرداخت معتبر نیست.')
      if (!signal?.aborted) setItems(payload)
    } catch (reason) {
      if (!signal?.aborted) setError(reason instanceof Error ? reason.message : 'دریافت صف انجام نشد.')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void load(controller.signal)
    return () => controller.abort()
  }, [load])

  async function act(item: PaymentDeadlineItem, action: 'complete' | 'deactivate') {
    if (acting.current || (action === 'deactivate' && confirmId !== item.id)) return
    acting.current = true
    setBusyId(item.id)
    setError('')
    setSuccess('')
    try {
      const response = await fetch(`/api/admin-hub/payment-deadlines/${item.id}/${action}`, { method: 'POST' })
      const payload = await response.json().catch(() => null)
      if (response.status === 401) { window.location.assign('/admin/login'); return }
      if (!response.ok) {
        if (response.status === 409) await load()
        throw new Error(response.status >= 500 ? 'سرویس مهلت پرداخت موقتاً در دسترس نیست؛ تکمیل عملیات تأیید نشد. صف را تازه کنید.' : payload?.detail || payload?.message || payload?.code || 'ثبت عملیات انجام نشد.')
      }
      if (!payload || payload.id !== item.id) throw new Error('پاسخ عملیات معتبر نیست؛ صف را تازه کنید.')
      setItems((current) => current.map((row) => row.id === item.id ? payload : row))
      setSuccess(action === 'complete' ? 'تکمیل تعهد ثبت شد.' : 'اپلیکیشن منتشرشده غیرفعال شد.')
      setConfirmId(null)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'ثبت عملیات انجام نشد.')
    } finally {
      acting.current = false
      setBusyId(null)
    }
  }

  return <section className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="text-lg font-bold">مهلت تعهد پرداخت</h2><p className="mt-1 text-sm text-muted-foreground">نزدیک‌ترین مهلت در ابتداست؛ غیرفعال‌سازی فقط با تصمیم صریح شما انجام می‌شود.</p></div>
      <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || busyId !== null}>تازه‌سازی</Button>
    </div>
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {success && <p role="status" className="rounded-xl bg-primary/5 p-4 text-sm">{success}</p>}
    {loading ? <p role="status">در حال دریافت صف...</p> : !error && sorted.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm">تعهد پرداختی در صف نیست.</p> : null}
    {!loading && !error && sorted.map((item) => <article key={item.id} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-xs text-muted-foreground">{item.developer.name} · <span dir="ltr">{item.packageName}</span></p></div>
        <Badge variant={item.paymentStatus === 'overdue' ? 'outline' : 'secondary'}>{paymentStatusLabels[item.paymentStatus]}</Badge>
      </div>
      <p className={'mt-4 text-xl font-bold ' + (item.daysRemaining !== null && item.daysRemaining < 0 ? 'text-destructive' : '')}>
        {item.daysRemaining === null ? (item.paymentStatus === 'completed' ? 'تکمیل تعهد ثبت شده' : 'تعداد روز نامشخص') : <><span dir="ltr">{item.daysRemaining.toLocaleString('fa-IR')}</span> روز باقی‌مانده</>}
      </p>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
        {([['پذیرش تعهد', item.paymentCommitmentAcceptedAt], ['اولین ارسال', item.deadlineStartedAt], ['پایان مهلت', item.deadlineAt], ['تکمیل پرداخت', item.paymentCompletedAt]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1">{paymentDate(value)}</dd></div>)}
      </dl>
      <p className="mt-4 text-sm">وضعیت فروشگاه: {item.publishedApplication ? (item.publishedApplication.enabled ? 'فعال' : 'غیرفعال') : 'هنوز منتشر نشده'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {item.paymentStatus !== 'completed' && <Button type="button" onClick={() => void act(item, 'complete')} disabled={busyId !== null}>ثبت تکمیل تعهد</Button>}
        {item.publishedApplication?.enabled && <Button type="button" variant="outline" onClick={() => setConfirmId(item.id)} disabled={busyId !== null}>غیرفعال‌کردن اپلیکیشن</Button>}
        {busyId === item.id && <span role="status" className="self-center text-sm">در حال ثبت...</span>}
      </div>
      {confirmId === item.id && <div role="group" aria-label="تأیید غیرفعال‌سازی" className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="text-sm">اپلیکیشن «{item.name}» با پکیج <span dir="ltr">{item.packageName}</span> در فروشگاه غیرفعال شود؟</p>
        <div className="mt-3 flex gap-2"><Button type="button" variant="destructive" onClick={() => void act(item, 'deactivate')} disabled={busyId !== null}>بله، غیرفعال شود</Button><Button type="button" variant="outline" onClick={() => setConfirmId(null)} disabled={busyId !== null}>انصراف</Button></div>
      </div>}
    </article>)}
  </section>
}

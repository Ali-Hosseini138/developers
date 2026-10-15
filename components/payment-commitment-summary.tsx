'use client'

import { useEffect, useState } from 'react'
import type { StoreApp } from '@/lib/types'
import { paymentDate, utcPaymentDate } from '@/lib/payment-deadline'

export function PaymentCommitmentSummary({ app }: { app: StoreApp }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 60000)
    return () => window.clearInterval(timer)
  }, [])
  const deadline = app.paymentDeadlineAt ? Date.parse(utcPaymentDate(app.paymentDeadlineAt)) : NaN
  const days = now !== null && Number.isFinite(deadline) ? Math.ceil((deadline - now) / 86400000) : null
  return <div className="mt-3 rounded-xl border border-border p-3 text-xs leading-6">
    <p>پرداخت درون‌برنامه‌ای: {app.hasInAppPayment ? 'دارد' : 'ندارد'} · Netbox Payment: {app.supportsNetboxPayment ? 'پشتیبانی می‌شود' : 'پشتیبانی نمی‌شود'}</p>
    {app.hasInAppPayment && !app.paymentCompletedAt && days !== null && <p className="mt-2 font-medium">{deadline < now! ? 'مهلت پرداخت پایان یافته است؛ وضعیت انتشار توسط تیم بررسی تعیین می‌شود.' : days < 1 ? 'کمتر از یک روز تا پایان مهلت پرداخت' : `${days.toLocaleString('fa-IR')} روز تا پایان مهلت پرداخت`}</p>}
    {app.hasInAppPayment && <dl className="mt-2 grid gap-2 sm:grid-cols-2">
      {([['پذیرش تعهد', app.paymentCommitmentAcceptedAt], ['شروع مهلت از اولین ارسال', app.paymentDeadlineStartedAt], ['پایان مهلت', app.paymentDeadlineAt], ['تکمیل تعهد', app.paymentCompletedAt]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{paymentDate(value)}</dd></div>)}
    </dl>}
  </div>
}

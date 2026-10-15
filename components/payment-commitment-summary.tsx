import type { StoreApp } from '@/lib/types'
import { paymentDate } from '@/lib/payment-deadline'

export function PaymentCommitmentSummary({ app }: { app: StoreApp }) {
  return <div className="mt-3 rounded-xl border border-border p-3 text-xs leading-6">
    <p>پرداخت درون‌برنامه‌ای: {app.hasInAppPayment ? 'دارد' : 'ندارد'} · Netbox Payment: {app.supportsNetboxPayment ? 'پشتیبانی می‌شود' : 'پشتیبانی نمی‌شود'}</p>
    {app.hasInAppPayment && <dl className="mt-2 grid gap-2 sm:grid-cols-2">
      {([['پذیرش تعهد', app.paymentCommitmentAcceptedAt], ['شروع مهلت از اولین ارسال', app.paymentDeadlineStartedAt], ['پایان مهلت', app.paymentDeadlineAt], ['تکمیل تعهد', app.paymentCompletedAt]] as const).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd>{paymentDate(value)}</dd></div>)}
    </dl>}
  </div>
}

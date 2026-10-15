export type PaymentDeadlineItem = {
  id: number
  name: string
  packageName: string
  developer: { id: number; name: string }
  hasInAppPayment: boolean
  paymentCommitmentAcceptedAt: string | null
  deadlineStartedAt: string | null
  deadlineAt: string | null
  daysRemaining: number | null
  paymentStatus: 'pending' | 'overdue' | 'completed' | 'missingDeadline'
  paymentCompletedAt: string | null
  publishedApplication: { id: number; enabled: boolean } | null
}

export const paymentStatusLabels: Record<PaymentDeadlineItem['paymentStatus'], string> = {
  pending: 'در مهلت انجام',
  overdue: 'مهلت گذشته',
  completed: 'تکمیل شده',
  missingDeadline: 'بدون تاریخ مهلت',
}

export function sortPaymentDeadlines(items: PaymentDeadlineItem[]) {
  const timestamp = (value: string | null) => {
    const date = value ? Date.parse(value) : NaN
    return Number.isFinite(date) ? date : Infinity
  }
  return [...items].sort((a, b) => timestamp(a.deadlineAt) - timestamp(b.deadlineAt))
}

export function paymentDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : '—'
}

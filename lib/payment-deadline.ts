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
  paymentStatus: 'pending' | 'overdue' | 'completed' | 'missing_deadline'
  paymentCompletedAt: string | null
  publishedApplication: { id: number; enabled: boolean } | null
}

export const paymentStatusLabels: Record<PaymentDeadlineItem['paymentStatus'], string> = {
  pending: 'در مهلت انجام',
  overdue: 'مهلت گذشته',
  completed: 'تکمیل شده',
  missing_deadline: 'بدون تاریخ مهلت',
}

export function sortPaymentDeadlines(items: PaymentDeadlineItem[]) {
  const timestamp = (value: string | null) => {
    const date = value ? Date.parse(utcPaymentDate(value)) : NaN
    return Number.isFinite(date) ? date : Infinity
  }
  return [...items].sort((a, b) => timestamp(a.deadlineAt) - timestamp(b.deadlineAt))
}

export function paymentDate(value?: string | null) {
  return value ? new Date(utcPaymentDate(value)).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : '—'
}

export function utcPaymentDate(value: string) {
  return /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : value + 'Z'
}

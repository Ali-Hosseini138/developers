import type { SupportTicket } from '@/lib/types'

export function TicketConversation({ question, answer, createdAt, answeredAt }: Pick<SupportTicket, 'question' | 'answer' | 'createdAt' | 'answeredAt'>) {
  return <ol className="mt-4 space-y-3" aria-label="سؤال و پاسخ تیکت">
    {[{ label: 'توسعه‌دهنده', body: question, date: createdAt }, ...(answer ? [{ label: 'تیم پشتیبانی نت‌استور', body: answer, date: answeredAt }] : [])].map((item, index) =>
      <li key={index} className="rounded-xl bg-secondary/50 p-4">
        <p className="text-xs font-medium">{item.label}</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.body}</p>
        {item.date && <p className="mt-2 text-xs text-muted-foreground">{new Date(item.date).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>}
      </li>)}
  </ol>
}

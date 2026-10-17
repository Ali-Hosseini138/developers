import type { SupportTicket } from '@/lib/types'

export function TicketConversation({ messages }: Pick<SupportTicket, 'messages'>) {
  return <ol className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto" aria-label="گفتگوی تیکت">
    {(messages || []).map(message => <li key={message.id} className={`rounded-xl p-4 ${message.senderType === 'staff' ? 'bg-primary/10' : 'bg-secondary/50'}`}>
      <p className="text-xs font-medium">{message.senderType === 'staff' ? 'پشتیبانی نت‌استور' : 'توسعه‌دهنده'}{message.senderName ? ` · ${message.senderName}` : ''}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{message.body}</p>
      <p className="mt-2 text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>
    </li>)}
  </ol>
}

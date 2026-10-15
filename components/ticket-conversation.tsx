import type { TicketMessage } from '@/lib/types'

export function TicketConversation({ messages = [], message, adminReply, createdAt, repliedAt }: {
  messages?: TicketMessage[]; message: string; adminReply?: string; createdAt: string; repliedAt?: string
}) {
  const history: TicketMessage[] = messages.length ? messages : [
    { id: 'original', role: 'developer', body: message, createdAt },
    ...(adminReply ? [{ id: 'legacy-reply', role: 'support' as const, body: adminReply, createdAt: repliedAt || '' }] : []),
  ]
  return <ol className="mt-4 space-y-3" aria-label="مکالمه تیکت">
    {history.map(item => <li key={item.id} className={item.role === 'support' ? 'rounded-xl border border-primary/20 bg-primary/5 p-4' : 'rounded-xl bg-secondary/50 p-4'}>
      <p className="text-xs font-medium">{item.role === 'support' ? 'تیم پشتیبانی نت‌استور' : 'توسعه‌دهنده'}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{item.body}</p>
      {item.createdAt && <p className="mt-2 text-xs text-muted-foreground">{Number.isNaN(Date.parse(item.createdAt)) ? item.createdAt : new Date(item.createdAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</p>}
    </li>)}
  </ol>
}

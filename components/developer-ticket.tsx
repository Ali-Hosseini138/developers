'use client'

import { useState } from 'react'
import { useStore } from '@/components/store-provider'
import { TicketConversation } from '@/components/ticket-conversation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { SupportTicket } from '@/lib/types'

export function DeveloperTicket({ ticket }: { ticket: SupportTicket }) {
  const { replyToTicket } = useStore()
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  async function send(action: 'reply' | 'resolve') {
    if (sending || (action === 'reply' && reply.trim().length < 2)) return
    setSending(true)
    setError('')
    try { await replyToTicket(ticket.id, reply, action); setReply('') }
    catch { setError('ثبت پاسخ انجام نشد. متن شما حفظ شده است؛ دوباره تلاش کنید.') }
    finally { setSending(false) }
  }
  return <article className="rounded-xl border border-border p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-medium">{ticket.subject}</h3><Badge variant="outline">{ticket.status === 'open' ? 'در انتظار پاسخ' : ticket.status === 'answered' ? 'پاسخ داده شد' : 'بسته‌شده'}</Badge></div>
    <TicketConversation {...ticket} />
    <form onSubmit={event => { event.preventDefault(); void send('reply') }} className="mt-4 space-y-3">
      <Label htmlFor={`reply-${ticket.id}`}>{ticket.status === 'closed' ? 'باز کردن مجدد و ادامه مکالمه' : 'پاسخ شما'}</Label>
      <Textarea id={`reply-${ticket.id}`} value={reply} onChange={event => setReply(event.target.value)} maxLength={10000} minLength={2} required placeholder="آیا مشکل حل شده؟ پاسخ خود را بنویسید..." disabled={sending} />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={sending || reply.trim().length < 2}>{sending ? 'در حال ثبت...' : 'ارسال پاسخ'}</Button>
        {ticket.status !== 'closed' && <Button type="button" variant="outline" disabled={sending} onClick={() => void send('resolve')}>مشکلم حل شد؛ بستن تیکت</Button>}
      </div>
    </form>
  </article>
}

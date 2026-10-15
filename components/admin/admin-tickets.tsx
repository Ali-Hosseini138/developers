'use client'

import { useRef, useState } from 'react'
import type { AdminSupportTicket } from '@/lib/types'
import { ticketError } from '@/lib/support-tickets'
import { TicketConversation } from '@/components/ticket-conversation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function AdminTickets({ tickets: initialTickets, initialError, onTicketsChange, onErrorChange }: { tickets: AdminSupportTicket[]; initialError: string; onTicketsChange: (tickets: AdminSupportTicket[]) => void; onErrorChange: (error: string) => void }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered'>('unanswered')
  async function refresh() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin-hub/tickets?status=all', { cache: 'no-store' })
      const payload = await response.json()
      if (response.status === 401) window.location.assign('/admin/login')
      if (!response.ok || !Array.isArray(payload.tickets)) throw new Error(ticketError(payload))
      setTickets(payload.tickets); onTicketsChange(payload.tickets); setError(''); onErrorChange('')
    } catch (error) { const message = error instanceof Error ? error.message : ticketError(null); setError(message); onErrorChange(message) }
    finally { setLoading(false) }
  }
  const q = query.trim().toLowerCase()
  const filtered = tickets.filter(ticket => (filter === 'all' || ticket.status === filter) &&
    (!q || [ticket.subject, ticket.question, ticket.developer.name, ticket.developer.email].some(value => value?.toLowerCase().includes(q))))
  return <section className="space-y-5">
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" disabled={loading} onClick={() => void refresh()}>{loading ? 'در حال دریافت...' : 'تازه‌سازی صندوق'}</Button>
      {(['unanswered', 'answered', 'all'] as const).map(status => <Button key={status} variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)}>{status === 'all' ? 'همه' : status === 'unanswered' ? 'در انتظار پاسخ' : 'پاسخ داده شده'} ({tickets.filter(ticket => status === 'all' || ticket.status === status).length.toLocaleString('fa-IR')})</Button>)}
    </div>
    <Input aria-label="جستجوی تیکت" value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو در موضوع، متن یا توسعه‌دهنده..." />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!error && !filtered.length && <p className="py-12 text-center text-muted-foreground">تیکتی با این فیلتر پیدا نشد.</p>}
    {filtered.map(ticket => <article key={ticket.id} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{ticket.subject}</h3><Badge variant="outline">{ticket.status === 'unanswered' ? 'در انتظار پاسخ' : 'پاسخ داده شده'}</Badge></div>
      <p className="mt-2 text-sm text-muted-foreground">{ticket.developer.name} · <span dir="ltr">{ticket.developer.email}</span> · تیکت #{ticket.id}</p>
      <TicketConversation {...ticket} />
      {ticket.status === 'unanswered' && <TicketReply ticket={ticket} onRefresh={refresh} onAnswered={updated => {
        const next = [...tickets.filter(item => item.id !== updated.id && item.status === 'unanswered'), updated, ...tickets.filter(item => item.id !== updated.id && item.status === 'answered')]
        setTickets(next); onTicketsChange(next)
      }} />}
    </article>)}
  </section>
}

export function TicketReply({ ticket, onRefresh, onAnswered }: { ticket: AdminSupportTicket; onRefresh: () => Promise<void>; onAnswered: (ticket: AdminSupportTicket) => void }) {
  const [answer, setAnswer] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [alreadyAnswered, setAlreadyAnswered] = useState(false)
  const inFlight = useRef(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (inFlight.current || alreadyAnswered || !answer.trim()) return
    inFlight.current = true; setSending(true); setError('')
    try {
      const response = await fetch(`/api/admin-hub/tickets/${encodeURIComponent(String(ticket.id))}/reply`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ answer: answer.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (response.status === 401) window.location.assign('/admin/login')
      if (response.status === 409) {
        setAlreadyAnswered(true)
        setError('این تیکت قبلاً پاسخ داده شده است. صندوق دوباره دریافت می‌شود.')
        await onRefresh()
        return
      }
      if (!response.ok) throw new Error(ticketError(payload))
      // Some APIs return a ticket, others only a confirmation. Re-fetch in either case.
      // Hide the form immediately after success; never allow an overwrite attempt.
      onAnswered({ ...ticket, status: 'answered', answer: payload?.answer || answer.trim(), answeredAt: payload?.answeredAt || null, updatedAt: payload?.updatedAt || ticket.updatedAt })
      await onRefresh()
    } catch (error) { setError(error instanceof Error ? error.message : ticketError(null)) }
    finally { inFlight.current = false; setSending(false) }
  }
  return <form onSubmit={submit} className="mt-4 space-y-3">
    <label htmlFor={`ticket-answer-${ticket.id}`} className="text-sm font-medium">پاسخ پشتیبانی (فقط یک بار قابل ارسال)</label>
    <Textarea id={`ticket-answer-${ticket.id}`} value={answer} onChange={event => setAnswer(event.target.value)} required minLength={1} maxLength={20000} disabled={sending || alreadyAnswered} placeholder="پاسخ را بنویسید..." />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={sending || alreadyAnswered || !answer.trim()}>{sending ? 'در حال ارسال...' : 'ارسال پاسخ'}</Button>
  </form>
}

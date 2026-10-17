'use client'

import { useState } from 'react'
import type { AdminSupportTicket } from '@/lib/types'
import { ticketError } from '@/lib/support-tickets'
import { TicketConversation } from '@/components/ticket-conversation'
import { TicketActions } from '@/components/ticket-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function AdminTickets({ tickets: initialTickets, initialError, onTicketsChange, onErrorChange }: { tickets: AdminSupportTicket[]; initialError: string; onTicketsChange: (tickets: AdminSupportTicket[]) => void; onErrorChange: (error: string) => void }) {
  const [tickets, setTickets] = useState(initialTickets)
  const [error, setError] = useState(initialError)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open')
  async function refresh() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin-hub/tickets?status=all', { cache: 'no-store' })
      const payload = await response.json()
      if (response.status === 401) window.location.assign('/admin/login')
      if (!response.ok || !Array.isArray(payload.tickets)) throw new Error(ticketError(payload))
      setTickets(payload.tickets); onTicketsChange(payload.tickets); setError(''); onErrorChange('')
    } catch (error) { const message = error instanceof Error ? error.message : ticketError(null); setError(message); onErrorChange(message); throw error }
    finally { setLoading(false) }
  }
  const q = query.trim().toLowerCase()
  const filtered = tickets.filter(ticket => (filter === 'all' || ticket.status === filter) &&
    (!q || [ticket.subject, ...(ticket.messages || []).map(message => message.body), ticket.developer?.name, ticket.developer?.email].some(value => value?.toLowerCase().includes(q))))
  return <section className="space-y-5">
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" disabled={loading} onClick={() => void refresh().catch(() => {})}>{loading ? 'در حال دریافت...' : 'تازه‌سازی صندوق'}</Button>
      {(['open', 'closed', 'all'] as const).map(status => <Button key={status} variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)}>{status === 'all' ? 'همه' : status === 'open' ? 'باز' : 'بسته'} ({tickets.filter(ticket => status === 'all' || ticket.status === status).length.toLocaleString('fa-IR')})</Button>)}
    </div>
    <Input aria-label="جستجوی تیکت" value={query} onChange={event => setQuery(event.target.value)} placeholder="جستجو در موضوع، گفتگو یا توسعه‌دهنده..." />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {!error && !filtered.length && <p className="py-12 text-center text-muted-foreground">تیکتی با این فیلتر پیدا نشد.</p>}
    {filtered.map(ticket => <article key={ticket.id} className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{ticket.subject}</h3><Badge variant="outline">{ticket.status === 'closed' ? 'بسته' : 'باز'}{!ticket.hasAdminReply ? ' · بدون پاسخ پشتیبانی' : ''}</Badge></div>
      <p className="mt-2 text-sm text-muted-foreground">{ticket.developer?.name} · <span dir="ltr">{ticket.developer?.email}</span> · تیکت #{ticket.id}</p>
      <TicketConversation {...ticket} />
      <TicketActions ticket={ticket} staff onRefresh={refresh} />
    </article>)}
  </section>
}

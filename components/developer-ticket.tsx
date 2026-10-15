'use client'

import { useState } from 'react'
import { TicketConversation } from '@/components/ticket-conversation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ticketError } from '@/lib/support-tickets'
import type { SupportTicket } from '@/lib/types'

export function DeveloperTicket({ ticket, onFollowUp }: { ticket: SupportTicket; onFollowUp: (ticket: SupportTicket) => void }) {
  const [latest, setLatest] = useState<SupportTicket | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const current = latest && latest.updatedAt > ticket.updatedAt ? latest : ticket
  async function refresh() {
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/developer/tickets/${encodeURIComponent(String(ticket.id))}`, { cache: 'no-store' })
      const payload = await response.json()
      if (response.status === 401) window.location.assign('/login?next=/dashboard')
      if (!response.ok) throw new Error(ticketError(payload))
      setLatest(payload)
    } catch (error) { setError(error instanceof Error ? error.message : ticketError(null)) }
    finally { setLoading(false) }
  }
  return <article className="rounded-xl border border-border p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-medium">{current.subject}</h3><Badge variant="outline">{current.status === 'unanswered' ? 'در انتظار پاسخ' : 'پاسخ داده شد'}</Badge></div>
    <TicketConversation {...current} />
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <div className="mt-4 flex flex-wrap gap-2">
      <Button variant="outline" disabled={loading} onClick={() => void refresh()}>{loading ? 'در حال دریافت...' : 'تازه‌سازی پاسخ'}</Button>
      {current.status === 'answered' && <Button variant="outline" onClick={() => onFollowUp(current)}>تیکت جدید برای پیگیری</Button>}
    </div>
  </article>
}

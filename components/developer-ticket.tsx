'use client'

import { useEffect, useRef, useState } from 'react'
import { TicketConversation } from '@/components/ticket-conversation'
import { TicketActions } from '@/components/ticket-actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ticketError } from '@/lib/support-tickets'
import type { SupportTicket } from '@/lib/types'

export function DeveloperTicket({ ticket }: { ticket: SupportTicket }) {
  const [current, setCurrent] = useState(ticket)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const generation = useRef(0)
  useEffect(() => { generation.current++; setCurrent(ticket); setLoading(false) }, [ticket])
  async function refresh() {
    const requestGeneration = ++generation.current
    setLoading(true); setError('')
    try {
      const response = await fetch(`/api/developer/tickets/${encodeURIComponent(String(ticket.id))}`, { cache: 'no-store' })
      const payload = await response.json()
      if (response.status === 401) window.location.assign('/login?next=/dashboard')
      if (!response.ok) throw new Error(ticketError(payload))
      if (generation.current === requestGeneration) setCurrent(payload)
    } catch (error) { if (generation.current === requestGeneration) setError(error instanceof Error ? error.message : ticketError(null)); throw error }
    finally { if (generation.current === requestGeneration) setLoading(false) }
  }
  return <article className="rounded-xl border border-border p-4">
    <div className="flex items-center justify-between gap-3"><h3 className="font-medium">{current.subject}</h3><Badge variant="outline">{current.status === 'closed' ? 'بسته' : 'باز'}</Badge></div>
    <TicketConversation {...current} />
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <Button className="mt-4" variant="outline" disabled={loading} onClick={() => void refresh().catch(() => {})}>{loading ? 'در حال دریافت...' : 'تازه‌سازی گفتگو'}</Button>
    <TicketActions key={ticket.id} ticket={current} onRefresh={refresh} />
  </article>
}

'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ticketError } from '@/lib/support-tickets'
import type { SupportTicket } from '@/lib/types'

export function TicketActions({ ticket, staff = false, onRefresh }: { ticket: SupportTicket; staff?: boolean; onRefresh: () => Promise<void> }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const inFlight = useRef(false)
  const base = `/api/${staff ? 'admin-hub' : 'developer'}/tickets/${encodeURIComponent(String(ticket.id))}`
  async function mutate(action: string) {
    if (inFlight.current) return
    inFlight.current = true; setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch(`${base}/${action}`, {
        method: 'POST', ...(action === 'messages' || action === 'reply' ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ body: message.trim() }) } : {}),
      })
      const payload = response.status === 204 ? null : await response.json().catch(() => null)
      if (response.status === 401) window.location.assign(staff ? '/admin/login' : '/login?next=/dashboard')
      if (!response.ok) throw new Error(ticketError(payload))
      if (action === 'messages' || action === 'reply') setMessage('')
      setNotice('عملیات ثبت شد.')
      try { await onRefresh() } catch { setError('عملیات ثبت شد، اما تازه‌سازی انجام نشد؛ پیش از اقدام دوباره، تیکت را تازه کنید.') }
    } catch (error) { setError(error instanceof Error ? error.message : ticketError(null)) }
    finally { inFlight.current = false; setBusy(false) }
  }
  return <div className="mt-4 space-y-3">
    <form onSubmit={event => { event.preventDefault(); if (message.trim()) void mutate(staff ? 'reply' : 'messages') }} className="space-y-3">
      <label htmlFor={`ticket-message-${staff ? 'staff-' : ''}${ticket.id}`} className="text-sm font-medium">{staff ? 'پاسخ پشتیبانی' : 'ادامه گفتگو'}</label>
      <Textarea id={`ticket-message-${staff ? 'staff-' : ''}${ticket.id}`} value={message} onChange={event => setMessage(event.target.value)} required maxLength={20000} disabled={busy} placeholder="پیام خود را بنویسید..." />
      {!staff && ticket.status === 'closed' && <p className="text-xs text-muted-foreground">ارسال پیام، این تیکت را دوباره باز می‌کند.</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy || !message.trim()}>{busy ? 'در حال انجام...' : 'ارسال پیام'}</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => void mutate(ticket.status === 'closed' ? 'reopen' : 'close')}>{ticket.status === 'closed' ? 'بازکردن تیکت' : 'بستن تیکت'}</Button>
      </div>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
  </div>
}

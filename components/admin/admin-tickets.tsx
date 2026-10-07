'use client'

import { useMemo, useState } from 'react'
import { MessageSquare, Search } from 'lucide-react'
import type { AdminSupportTicket } from '@/app/admin/page'
import { updateSupportTicketAction } from '@/app/admin/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

function statusLabel(status: AdminSupportTicket['status']) {
  if (status === 'answered') return 'پاسخ داده شده'
  if (status === 'closed') return 'بسته شده'
  return 'باز'
}

function faDateTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('fa-IR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function AdminTickets({ tickets }: { tickets: AdminSupportTicket[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'answered' | 'closed'>('open')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return tickets.filter((ticket) => {
      const statusOk = filter === 'all' || ticket.status === filter
      const queryOk =
        !q ||
        ticket.subject.toLowerCase().includes(q) ||
        ticket.message.toLowerCase().includes(q) ||
        ticket.developer.toLowerCase().includes(q) ||
        ticket.developer_email?.toLowerCase().includes(q)
      return statusOk && queryOk
    })
  }, [tickets, query, filter])

  const openCount = tickets.filter((ticket) => ticket.status === 'open').length
  const answeredCount = tickets.filter((ticket) => ticket.status === 'answered').length
  const closedCount = tickets.filter((ticket) => ticket.status === 'closed').length

  return (
    <section className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TicketStat label="کل تیکت‌ها" value={tickets.length} />
        <TicketStat label="باز" value={openCount} />
        <TicketStat label="پاسخ داده شده" value={answeredCount} />
        <TicketStat label="بسته شده" value={closedCount} />
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو در موضوع، متن یا توسعه‌دهنده..."
              className="pr-9"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {[
              ['open', 'باز'],
              ['answered', 'پاسخ داده شده'],
              ['closed', 'بسته شده'],
              ['all', 'همه'],
            ].map(([id, label]) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant={filter === id ? 'default' : 'outline'}
                onClick={() => setFilter(id as typeof filter)}
                className="shrink-0"
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          تیکتی با این فیلتر پیدا نشد.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((ticket) => (
            <article key={ticket.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <MessageSquare className="size-4 text-primary" />
                    <h3 className="font-bold">{ticket.subject}</h3>
                    <Badge variant={ticket.status === 'open' ? 'default' : 'outline'}>
                      {statusLabel(ticket.status)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>توسعه‌دهنده: <strong className="text-foreground">{ticket.developer}</strong></span>
                    {ticket.developer_email && <span dir="ltr">{ticket.developer_email}</span>}
                    <span>ثبت: {faDateTime(ticket.created_at)}</span>
                  </div>
                  <div className="mt-4 rounded-xl bg-secondary/50 p-4">
                    <p className="text-xs text-muted-foreground">پیام توسعه‌دهنده</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{ticket.message}</p>
                  </div>

                  {ticket.admin_reply && (
                    <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <p className="text-xs font-medium text-primary">پاسخ تیم نت‌استور</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{ticket.admin_reply}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{faDateTime(ticket.replied_at)}</p>
                    </div>
                  )}
                </div>

                <div className="w-full shrink-0 xl:w-[360px]">
                  {ticket.status !== 'closed' && (
                    <form action={updateSupportTicketAction} className="flex flex-col gap-2">
                      <input type="hidden" name="ticketId" value={ticket.id} />
                      <input type="hidden" name="action" value="reply" />
                      <Textarea
                        name="reply"
                        required
                        minLength={2}
                        defaultValue={ticket.admin_reply || ''}
                        placeholder="پاسخ ادمین را بنویسید..."
                        className="min-h-28"
                      />
                      <Button type="submit">ارسال پاسخ</Button>
                    </form>
                  )}

                  <form action={updateSupportTicketAction} className="mt-2">
                    <input type="hidden" name="ticketId" value={ticket.id} />
                    <input type="hidden" name="action" value={ticket.status === 'closed' ? 'reopen' : 'close'} />
                    <Button type="submit" variant="outline" className="w-full">
                      {ticket.status === 'closed' ? 'باز کردن مجدد' : 'بستن تیکت'}
                    </Button>
                  </form>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function TicketStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value.toLocaleString('fa-IR')}</p>
    </div>
  )
}

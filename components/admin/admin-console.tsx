'use client'

import { useState } from 'react'
import { MessageSquare, PackageCheck } from 'lucide-react'
import type { AdminApp, AdminSupportTicket } from '@/app/admin/page'
import { AdminApps } from '@/components/admin/admin-apps'
import { AdminTickets } from '@/components/admin/admin-tickets'
import { Button } from '@/components/ui/button'

type AdminStat = { label: string; value: number }

export function AdminConsole({ apps, stats, tickets }: { apps: AdminApp[]; stats: AdminStat[]; tickets: AdminSupportTicket[] }) {
  const [tab, setTab] = useState<'reviews' | 'tickets'>('reviews')

  return (
    <>
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">
        <Button type="button" variant={tab === 'reviews' ? 'default' : 'ghost'} onClick={() => setTab('reviews')} className="shrink-0 gap-2">
          <PackageCheck className="size-4" />
          بررسی و انتشار
        </Button>
        <Button type="button" variant={tab === 'tickets' ? 'default' : 'ghost'} onClick={() => setTab('tickets')} className="shrink-0 gap-2">
          <MessageSquare className="size-4" />
          تیکت‌ها
          {tickets.filter((ticket) => ticket.status === 'open').length > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] text-destructive-foreground">
              {tickets.filter((ticket) => ticket.status === 'open').length.toLocaleString('fa-IR')}
            </span>
          )}
        </Button>
      </div>

      {tab === 'reviews' && (
        <>
          <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-2xl font-bold text-card-foreground">{stat.value.toLocaleString('fa-IR')}</p>
              </div>
            ))}
          </section>
          <AdminApps apps={apps} />
        </>
      )}

      {tab === 'tickets' && <AdminTickets tickets={tickets} />}
    </>
  )
}

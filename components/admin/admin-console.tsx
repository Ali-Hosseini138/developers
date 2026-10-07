'use client'

import { useMemo, useState } from 'react'
import { Activity, CalendarDays, Handshake, PackageCheck, ShoppingCart, Store } from 'lucide-react'
import type { AdminApp } from '@/app/admin/page'
import { AdminApps } from '@/components/admin/admin-apps'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type AdminStat = { label: string; value: number }

const PARTNERS = [
  { id: 'filimo', name: 'فیلیمو', netboxDaily: 182, publicDaily: 71, salesDaily: 34 },
  { id: 'filmnet', name: 'فیلم‌نت', netboxDaily: 164, publicDaily: 64, salesDaily: 29 },
  { id: 'shida', name: 'شیدا', netboxDaily: 92, publicDaily: 41, salesDaily: 15 },
  { id: 'gymshow', name: 'جیم‌شو', netboxDaily: 54, publicDaily: 28, salesDaily: 8 },
  { id: 'appetit', name: 'اپتیت', netboxDaily: 43, publicDaily: 25, salesDaily: 6 },
  { id: 'namava', name: 'نماوا', netboxDaily: 151, publicDaily: 59, salesDaily: 27 },
  { id: 'gapfilm', name: 'گپ‌فیلم', netboxDaily: 83, publicDaily: 38, salesDaily: 13 },
  { id: 'tantan', name: 'تن‌تن', netboxDaily: 48, publicDaily: 24, salesDaily: 7 },
  { id: 'dramaqueen', name: 'دراما کوئین', netboxDaily: 77, publicDaily: 36, salesDaily: 12 },
  { id: 'popcorn', name: 'پاپ‌کورن', netboxDaily: 68, publicDaily: 31, salesDaily: 10 },
] as const

type RangePreset = 7 | 30 | 90 | 180 | 'custom'

function demoMetric(base: number, days: number, seed: number) {
  const season = 1 + ((seed % 5) - 2) * 0.035
  const growth = 1 + Math.min(days, 180) / 1800
  return Math.round(base * days * season * growth)
}

function formatNumber(value: number) {
  return value.toLocaleString('fa-IR')
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime()
  const end = new Date(`${to}T00:00:00`).getTime()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 30
  return Math.max(1, Math.floor((end - start) / 86400000) + 1)
}

export function AdminConsole({ apps, stats }: { apps: AdminApp[]; stats: AdminStat[] }) {
  const [tab, setTab] = useState<'reviews' | 'partners'>('reviews')

  return (
    <>
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">
        <Button type="button" variant={tab === 'reviews' ? 'default' : 'ghost'} onClick={() => setTab('reviews')} className="shrink-0 gap-2">
          <PackageCheck className="size-4" />
          بررسی و انتشار
        </Button>
        <Button type="button" variant={tab === 'partners' ? 'default' : 'ghost'} onClick={() => setTab('partners')} className="shrink-0 gap-2">
          <Handshake className="size-4" />
          پارتنرها
        </Button>
      </div>

      {tab === 'reviews' ? (
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
      ) : (
        <PartnerAnalytics />
      )}
    </>
  )
}

function PartnerAnalytics() {
  const [range, setRange] = useState<RangePreset>(30)
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(today.getDate() - 29)
  const toIso = (date: Date) => date.toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(toIso(thirtyDaysAgo))
  const [toDate, setToDate] = useState(toIso(today))

  const days = range === 'custom' ? daysBetween(fromDate, toDate) : range

  const rows = useMemo(() => PARTNERS.map((partner, index) => {
    const netbox = demoMetric(partner.netboxDaily, days, index + 1)
    const publicStore = demoMetric(partner.publicDaily, days, index + 7)
    const subscriptionSales = demoMetric(partner.salesDaily, days, index + 13)
    return {
      ...partner,
      netbox,
      publicStore,
      totalInstalls: netbox + publicStore,
      subscriptionSales,
    }
  }), [days])

  const totals = rows.reduce((acc, row) => ({
    netbox: acc.netbox + row.netbox,
    publicStore: acc.publicStore + row.publicStore,
    totalInstalls: acc.totalInstalls + row.totalInstalls,
    subscriptionSales: acc.subscriptionSales + row.subscriptionSales,
  }), { netbox: 0, publicStore: 0, totalInstalls: 0, subscriptionSales: 0 })

  return (
    <section className="flex flex-col gap-6">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
        <strong>داده نمایشی — Demo</strong>
        <span className="mr-2 text-muted-foreground">
          این اعداد برای ارائه پنل ساخته شده‌اند و بعداً منبع آن‌ها با API واقعی نصب و فروش جایگزین می‌شود.
        </span>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Handshake className="size-5 text-primary" />
              <h2 className="text-xl font-bold">عملکرد پارتنرهای نت‌باکس</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              مقایسه نصب در نت‌استور نت‌باکس، نت‌استور پابلیک و فروش اشتراک در بازه انتخابی.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[7, 30, 90, 180].map((value) => (
              <Button key={value} type="button" size="sm" variant={range === value ? 'default' : 'outline'} onClick={() => setRange(value as 7 | 30 | 90 | 180)}>
                {value.toLocaleString('fa-IR')} روز
              </Button>
            ))}
            <Button type="button" size="sm" variant={range === 'custom' ? 'default' : 'outline'} onClick={() => setRange('custom')}>
              بازه سفارشی
            </Button>
          </div>
        </div>

        {range === 'custom' && (
          <div className="mt-5 grid gap-3 rounded-xl bg-secondary/50 p-4 sm:grid-cols-2 lg:max-w-xl">
            <label className="text-sm">
              <span className="mb-1.5 block text-xs text-muted-foreground">از تاریخ</span>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} dir="ltr" />
            </label>
            <label className="text-sm">
              <span className="mb-1.5 block text-xs text-muted-foreground">تا تاریخ</span>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} dir="ltr" />
            </label>
          </div>
        )}

        <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarDays className="size-3.5" />
          تجمیع عملکرد در بازه {days.toLocaleString('fa-IR')} روزه
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <PartnerKpi icon={<Store className="size-5" />} label="نصب نت‌استور نت‌باکس" value={totals.netbox} />
        <PartnerKpi icon={<Activity className="size-5" />} label="نصب نت‌استور پابلیک" value={totals.publicStore} />
        <PartnerKpi icon={<PackageCheck className="size-5" />} label="مجموع نصب" value={totals.totalInstalls} />
        <PartnerKpi icon={<ShoppingCart className="size-5" />} label="فروش اشتراک" value={totals.subscriptionSales} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border p-5">
          <h3 className="font-bold">جزئیات عملکرد پارتنرها</h3>
          <p className="mt-1 text-sm text-muted-foreground">اعداد جدول همگی برای همان بازه زمانی انتخاب‌شده تجمیع شده‌اند.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-secondary/60 text-xs text-muted-foreground">
              <tr>
                <th className="px-5 py-3 text-right font-medium">پارتنر</th>
                <th className="px-5 py-3 text-right font-medium">نصب نت‌استور نت‌باکس</th>
                <th className="px-5 py-3 text-right font-medium">نصب نت‌استور پابلیک</th>
                <th className="px-5 py-3 text-right font-medium">مجموع نصب</th>
                <th className="px-5 py-3 text-right font-medium">فروش اشتراک</th>
                <th className="px-5 py-3 text-right font-medium">نرخ فروش به نصب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((row) => {
                const conversion = row.totalInstalls ? (row.subscriptionSales / row.totalInstalls) * 100 : 0
                return (
                  <tr key={row.id} className="hover:bg-secondary/30">
                    <td className="px-5 py-4 font-semibold">{row.name}</td>
                    <td className="px-5 py-4">{formatNumber(row.netbox)}</td>
                    <td className="px-5 py-4">{formatNumber(row.publicStore)}</td>
                    <td className="px-5 py-4 font-medium">{formatNumber(row.totalInstalls)}</td>
                    <td className="px-5 py-4 font-medium">{formatNumber(row.subscriptionSales)}</td>
                    <td className="px-5 py-4">{conversion.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="border-t-2 border-border bg-secondary/40 font-bold">
              <tr>
                <td className="px-5 py-4">مجموع</td>
                <td className="px-5 py-4">{formatNumber(totals.netbox)}</td>
                <td className="px-5 py-4">{formatNumber(totals.publicStore)}</td>
                <td className="px-5 py-4">{formatNumber(totals.totalInstalls)}</td>
                <td className="px-5 py-4">{formatNumber(totals.subscriptionSales)}</td>
                <td className="px-5 py-4">
                  {totals.totalInstalls ? ((totals.subscriptionSales / totals.totalInstalls) * 100).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) : '۰'}٪
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </section>
  )
}

function PartnerKpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">{icon}</span>
      <p className="mt-4 text-2xl font-bold">{formatNumber(value)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

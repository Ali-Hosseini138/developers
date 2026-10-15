'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { datedSegments, exportFileName, statsError, statsQuery, type InstallStats } from '@/lib/developer-stats'
import type { StoreApp } from '@/lib/types'

const number = (value: number | null | undefined) => value == null ? '—' : value.toLocaleString('fa-IR', { maximumFractionDigits: 2 })
const day = (value: string) => new Date(`${value}T12:00:00Z`).toLocaleDateString('fa-IR', { timeZone: 'Asia/Tehran' })

export function DeveloperInstallStats({ myApps }: { myApps: StoreApp[] }) {
  const apps = useMemo(() => myApps.filter(app => app.isPublished === true), [myApps])
  const [appId, setAppId] = useState(apps[0]?.id || '')
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | 'custom'>('1m')
  const [start, setStart] = useState(''), [end, setEnd] = useState('')
  const [result, setResult] = useState<{ key: string; data: InstallStats } | null>(null)
  const [loading, setLoading] = useState(false), [error, setError] = useState('')
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const exportRequest = useRef<AbortController | null>(null)
  const selected = apps.find(app => app.id === appId)
  const today = new Date().toISOString().slice(0, 10)
  let query = '', rangeError = ''
  try {
    if (period === 'custom' && (!start || !end)) rangeError = 'تاریخ شروع و پایان را انتخاب کنید.'
    else query = statsQuery(new URLSearchParams(period === 'custom' ? { startDate: start, endDate: end } : { period }), today)
  } catch (reason) { rangeError = (reason as Error).message }
  const key = `${appId}?${query}`
  const latestKey = useRef(key)
  latestKey.current = key
  const data = result?.key === key ? result.data : null

  useEffect(() => {
    if (!apps.some(app => app.id === appId)) setAppId(apps[0]?.id || '')
  }, [apps, appId])

  useEffect(() => {
    exportRequest.current?.abort()
    setExportError('')
    setResult(null)
    setError('')
    if (!selected || !query) { setLoading(false); return }
    const controller = new AbortController()
    setLoading(true)
    async function load() {
      try {
        const response = await fetch(`/api/developer-hub/apps/${encodeURIComponent(appId)}/stats?${query}`, { cache: 'no-store', signal: controller.signal })
        const payload = await response.json().catch(() => null)
        if (response.status === 401) { window.location.assign('/login?next=/dashboard%3Ftab%3Danalytics'); return }
        if (!response.ok) throw new Error(statsError(payload))
        if (!payload || String(payload.appId) !== appId || !Array.isArray(payload.points) || !payload.summary) throw new Error('پاسخ آمار معتبر نیست.')
        if (!controller.signal.aborted) setResult({ key, data: payload })
      } catch (reason) {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'دریافت آمار انجام نشد.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    void load()
    return () => { controller.abort(); exportRequest.current?.abort() }
  }, [appId, query, key, Boolean(selected), refresh])

  async function download() {
    if (!selected || !data || loading || exporting || !query) return
    const requestedKey = key
    const controller = new AbortController()
    exportRequest.current = controller
    setExporting(true)
    setExportError('')
    try {
      const response = await fetch(`/api/developer-hub/apps/${encodeURIComponent(appId)}/stats/export?${query}`, { cache: 'no-store', signal: controller.signal })
      if (response.status === 401) { window.location.assign('/login?next=/dashboard%3Ftab%3Danalytics'); return }
      if (!response.ok || !response.headers.get('Content-Type')?.toLowerCase().startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        throw new Error(statsError(await response.json().catch(() => null), 'دریافت فایل اکسل انجام نشد.'))
      }
      const blob = await response.blob()
      if (controller.signal.aborted || latestKey.current !== requestedKey) return
      const url = URL.createObjectURL(blob), anchor = document.createElement('a')
      anchor.href = url
      anchor.download = exportFileName(response.headers.get('Content-Disposition'))
      document.body.appendChild(anchor); anchor.click(); anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (reason) {
      if (!controller.signal.aborted) setExportError(reason instanceof Error ? reason.message : 'دریافت فایل انجام نشد.')
    } finally { setExporting(false) }
  }

  if (!apps.length) return <section className="mt-8 rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">آمار نصب و خروجی اکسل پس از انتشار اولین اپلیکیشن در دسترس قرار می‌گیرند.</section>
  return <section className="mt-8 space-y-6">
    <div className="flex flex-wrap items-end gap-5 rounded-2xl border border-border bg-card p-5">
      <div className="min-w-56"><Label htmlFor="stats-app">نام اپلیکیشن</Label><select id="stats-app" value={appId} onChange={event => setAppId(event.target.value)} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">{apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}</select></div>
      <fieldset><legend className="text-sm font-medium">بازه زمانی</legend><div className="mt-2 flex flex-wrap gap-2">{([['1m', 'یک ماه'], ['3m', 'سه ماه'], ['6m', 'شش ماه'], ['custom', 'بازه دلخواه']] as const).map(([value, label]) => <Button key={value} type="button" variant={period === value ? 'default' : 'outline'} onClick={() => setPeriod(value)}>{label}</Button>)}</div></fieldset>
      <Button type="button" variant="outline" onClick={() => setRefresh(value => value + 1)} disabled={loading || !query}>تازه‌سازی</Button>
      <Button type="button" onClick={() => void download()} disabled={!data || loading || exporting || !query}>{exporting ? 'در حال دریافت...' : 'خروجی اکسل روند نصب'}</Button>
      {period === 'custom' && <div className="grid w-full gap-3 sm:grid-cols-2"><div><Label htmlFor="stats-start">از تاریخ</Label><Input id="stats-start" type="date" dir="ltr" value={start} max={end || today} onChange={event => setStart(event.target.value)} className="mt-2" /></div><div><Label htmlFor="stats-end">تا تاریخ</Label><Input id="stats-end" type="date" dir="ltr" value={end} min={start} max={today} onChange={event => setEnd(event.target.value)} className="mt-2" /></div></div>}
      {rangeError && <p role="alert" className="w-full text-sm text-destructive">{rangeError}</p>}
    </div>
    {loading && <p role="status" className="text-sm text-muted-foreground">در حال دریافت آمار نصب...</p>}
    {error && <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>}
    {exportError && <p role="alert" className="text-sm text-destructive">{exportError}</p>}
    {data && <>
      <p className="text-sm text-muted-foreground">{day(data.startDate)} تا {day(data.endDate)} · روزهای آماری بر اساس UTC هستند.</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
        ['نصب فعلی', number(data.summary.currentInstallCount)], ['تغییر خالص در بازه', number(data.summary.netChange)],
        ['میانگین تغییر روزانه', number(data.summary.averageDailyChange)], ['بیشترین تغییر روزانه', number(data.summary.peakDailyChange)],
        ['نصب ابتدای بازه', number(data.summary.startInstallCount)], ['نصب انتهای بازه', number(data.summary.endInstallCount)],
        ['روز اوج تغییر', data.summary.peakDate ? day(data.summary.peakDate) : '—'], ['پوشش داده', `${number(data.summary.daysWithData)} از ${number(data.summary.daysInRange)} روز`],
      ].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p dir="auto" className="mt-2 text-xl font-bold">{value}</p></div>)}</div>
      {!data.points.length ? <p className="rounded-xl border border-dashed border-border p-10 text-center text-sm">برای این بازه هنوز داده‌ای ثبت نشده است.</p> : <>
        {data.summary.daysWithData < data.summary.daysInRange && <p className="rounded-xl bg-secondary/60 p-4 text-sm">برای بعضی روزها داده نداریم؛ فاصله‌های نمودار به معنی صفر نصب نیستند.</p>}
        <InstallChart title="تغییر خالص نصب روزانه" points={data.points.map(point => ({ date: point.date, value: point.change }))} start={data.startDate} end={data.endDate} />
        <InstallChart title="روند تعداد کل نصب" points={data.points.map(point => ({ date: point.date, value: point.installCount }))} start={data.startDate} end={data.endDate} />
        <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm"><caption className="p-4 text-right font-bold">آمار روزهای ثبت‌شده</caption><thead className="bg-secondary/60"><tr>{['تاریخ', 'تعداد کل نصب', 'تغییر خالص'].map(text => <th key={text} className="p-3 text-right">{text}</th>)}</tr></thead><tbody>{data.points.map(point => <tr key={point.date} className="border-t border-border"><td className="p-3">{day(point.date)}</td><td className="p-3">{number(point.installCount)}</td><td className="p-3" dir="auto">{number(point.change)}</td></tr>)}</tbody></table></div>
      </>}
    </>}
    <p className="text-xs leading-6 text-muted-foreground">آمار روزانه ساعت ۲۳:۵۰ UTC ثبت می‌شود؛ تاریخچه از زمان فعال‌شدن ثبت آمار در دسترس است.</p>
  </section>
}

export function InstallChart({ title, points, start, end }: { title: string; points: Array<{ date: string; value: number | null }>; start: string; end: string }) {
  const finite = points.filter(point => point.value !== null && Number.isFinite(point.value))
  if (!finite.length) return <div className="rounded-xl border border-border bg-card p-5"><h3 className="font-bold">{title}</h3><p className="mt-3 text-sm text-muted-foreground">هنوز تغییر قابل محاسبه‌ای ثبت نشده است.</p></div>
  const min = Math.min(0, ...finite.map(point => point.value!)), max = Math.max(0, ...finite.map(point => point.value!))
  const first = Date.parse(start), span = Math.max(86400000, Date.parse(end) - first), height = 200
  const x = (date: string) => 65 + (Date.parse(date) - first) / span * 670
  const y = (value: number) => 20 + height - (value - min) / (max - min || 1) * height
  return <div className="rounded-2xl border border-border bg-card p-5"><h3 className="font-bold">{title}</h3><div className="mt-4 overflow-x-auto" dir="ltr"><svg viewBox="0 0 800 270" className="min-w-[560px] w-full" role="img" aria-label={title}>
    {[0, 1, 2, 3, 4].map(index => { const value = min + (max - min) * index / 4; return <g key={index}><line x1="65" x2="735" y1={y(value)} y2={y(value)} stroke="currentColor" opacity="0.1" /><text x="55" y={y(value) + 4} textAnchor="end" fontSize="11" fill="currentColor">{number(value)}</text></g> })}
    <line x1="65" x2="735" y1={y(0)} y2={y(0)} stroke="currentColor" opacity="0.35" />
    {datedSegments(points).map((segment, index) => <polyline key={index} fill="none" stroke="var(--primary)" strokeWidth="2" points={segment.map(point => `${x(point.date)},${y(point.value)}`).join(' ')} />)}
    {finite.map(point => <circle key={point.date} cx={x(point.date)} cy={y(point.value!)} r="3" fill="var(--primary)"><title>{day(point.date)}: {number(point.value)}</title></circle>)}
    <text x="65" y="250" fontSize="11" fill="currentColor">{day(start)}</text><text x="735" y="250" textAnchor="end" fontSize="11" fill="currentColor">{day(end)}</text>
  </svg></div></div>
}

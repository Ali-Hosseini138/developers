export type InstallPoint = { date: string; installCount: number; change: number | null }
export type InstallStats = {
  appId: number; period: '1m' | '3m' | '6m' | 'custom'; startDate: string; endDate: string
  points: InstallPoint[]
  summary: {
    currentInstallCount: number; startInstallCount: number | null; endInstallCount: number | null
    netChange: number; averageDailyChange: number | null; peakDailyChange: number | null; peakDate: string | null
    daysWithData: number; daysInRange: number
  }
}

export function statsQuery(search: URLSearchParams, today = new Date().toISOString().slice(0, 10)) {
  const period = search.get('period'), start = search.get('startDate'), end = search.get('endDate')
  if (period && (start || end)) throw new Error('فقط یک بازه زمانی انتخاب کنید.')
  if (start || end) {
    const valid = (value: string | null) => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value)
    if (!valid(start) || !valid(end)) throw new Error('تاریخ شروع و پایان معتبر را با هم وارد کنید.')
    if (start! > end!) throw new Error('تاریخ پایان نباید قبل از تاریخ شروع باشد.')
    if (end! > today) throw new Error('تاریخ پایان نباید در آینده باشد.')
    if ((Date.parse(end!) - Date.parse(start!)) / 86400000 + 1 > 366) throw new Error('بازه زمانی حداکثر ۳۶۶ روز است.')
    return new URLSearchParams({ startDate: start!, endDate: end! }).toString()
  }
  if (period && !['1m', '3m', '6m'].includes(period)) throw new Error('بازه زمانی معتبر انتخاب کنید.')
  return new URLSearchParams({ period: period || '1m' }).toString()
}

export function statsError(payload: unknown, fallback = 'دریافت آمار انجام نشد.') {
  if (!payload || typeof payload !== 'object') return fallback
  const data = payload as Record<string, unknown>
  if (typeof data.message === 'string') return data.message
  if (typeof data.detail === 'string') return data.detail
  for (const value of Object.values(data)) if (Array.isArray(value) && typeof value[0] === 'string') return value[0]
  return fallback
}

export function exportFileName(disposition: string | null, fallback = 'install-stats.xlsx') {
  const extended = /filename\*=UTF-8''([^;]+)/i.exec(disposition || '')
  let name = /filename="([^"]+)"|filename=([^;]+)/i.exec(disposition || '')?.slice(1).find(Boolean) || fallback
  if (extended) { try { name = decodeURIComponent(extended[1]) } catch { /* Use regular filename. */ } }
  return name.replace(/[\\/\u0000-\u001f\u007f]/g, '_').trim().replace(/^\.+/, '') || fallback
}

export function datedSegments(points: Array<{ date: string; value: number | null }>) {
  const segments: Array<Array<{ date: string; value: number }>> = []
  let previous = NaN
  for (const point of points) {
    const time = Date.parse(point.date)
    if (point.value === null || !Number.isFinite(point.value)) { previous = NaN; continue }
    if (!Number.isFinite(previous) || time - previous !== 86400000) segments.push([])
    segments[segments.length - 1].push({ date: point.date, value: point.value })
    previous = time
  }
  return segments
}

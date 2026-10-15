import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'
import { statsQuery } from '@/lib/developer-stats'

export async function proxyDeveloperStats(request: Request, id: string, exportFile = false) {
  if (!/^[1-9]\d*$/.test(id)) return Response.json({ detail: 'اپلیکیشن پیدا نشد.' }, { status: 404 })
  let query: string
  try { query = statsQuery(new URL(request.url).searchParams) }
  catch (error) { return Response.json({ detail: (error as Error).message }, { status: 400 }) }
  try {
    const response = await developerHubApi(`/api/v1/developer-hub/apps/${id}/stats/${exportFile ? 'export/' : ''}?${query}`)
    if (!exportFile || !response.ok) {
      const result = copyBackendResponse(response, await response.json().catch(() => ({ detail: 'پاسخ سرویس معتبر نیست.' })))
      result.headers.set('Cache-Control', 'private, no-store')
      return result
    }
    const type = response.headers.get('Content-Type') || ''
    if (!type.toLowerCase().startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      return Response.json({ detail: 'سرویس فایل اکسل معتبر برنگرداند.' }, { status: 502 })
    }
    const headers = new Headers({ 'Content-Type': type, 'Cache-Control': 'private, no-store' })
    const disposition = response.headers.get('Content-Disposition')
    if (disposition) headers.set('Content-Disposition', disposition)
    return new Response(response.body, { status: response.status, headers })
  } catch {
    return Response.json({ detail: 'ارتباط با سرویس آمار برقرار نشد. دوباره تلاش کنید.' }, { status: 502 })
  }
}

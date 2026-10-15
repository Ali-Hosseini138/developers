import { randomUUID } from 'node:crypto'
import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = url.searchParams.get('page') || '1'
  const pageSize = url.searchParams.get('page_size') || '200'
  const supportReference = randomUUID()
  // Retry only this read, once. Never repeat an upload or a mutation here.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const startedAt = Date.now()
    try {
      const response = await developerHubApi(`/api/v1/developer-hub/apps/?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        console.error('developer_apps_read_failed', { supportReference, attempt, status: response.status, durationMs: Date.now() - startedAt })
        if (attempt === 1 && [502, 503, 504].includes(response.status)) continue
        const result = copyBackendResponse(response, {
          ...(payload && typeof payload === 'object' ? payload : { detail: 'دریافت اپلیکیشن‌ها از سرویس انجام نشد.' }),
          supportReference,
        })
        return result
      }
      if (!Array.isArray(payload?.results)) {
        console.error('developer_apps_read_failed', { supportReference, attempt, status: response.status, reason: 'invalid_list_response' })
        return NextResponse.json({ detail: 'سرویس اپلیکیشن‌ها پاسخ معتبر برنگرداند.', supportReference }, { status: 502 })
      }
      return copyBackendResponse(response, payload)
    } catch (error) {
      const failure = error as { name?: string; code?: string; cause?: { code?: string } }
      // Record transport metadata only, never credentials, bearer tokens or upstream bodies.
      console.error('developer_apps_read_failed', { supportReference, attempt, name: failure?.name, code: failure?.cause?.code || failure?.code, durationMs: Date.now() - startedAt })
      if (attempt === 1) continue
      return NextResponse.json({ detail: 'ارتباط با سرویس اپلیکیشن‌ها برقرار نشد. کمی بعد دوباره تلاش کنید.', supportReference }, { status: 502 })
    }
  }
}

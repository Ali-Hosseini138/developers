import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = url.searchParams.get('page') || '1'
  const pageSize = url.searchParams.get('page_size') || '200'
  try {
    const response = await developerHubApi(`/api/v1/developer-hub/apps/?page=${encodeURIComponent(page)}&page_size=${encodeURIComponent(pageSize)}`)
    const payload = await response.json().catch(() => null)
    if (response.ok && !Array.isArray(payload?.results)) return NextResponse.json({ detail: 'پاسخ فهرست اپلیکیشن‌ها معتبر نیست.' }, { status: 502 })
    return copyBackendResponse(response, payload || { detail: 'دریافت اپلیکیشن‌ها انجام نشد.' })
  } catch {
    return NextResponse.json({ detail: 'ارتباط با سرویس اپلیکیشن‌ها برقرار نشد. دوباره تلاش کنید.' }, { status: 502 })
  }
}

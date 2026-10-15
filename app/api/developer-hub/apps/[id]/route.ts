import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const response = await developerHubApi(`/api/v1/developer-hub/apps/${encodeURIComponent(id)}/`)
    const payload = await response.json().catch(() => null)
    if (response.ok && String(payload?.id) !== id) return NextResponse.json({ detail: 'پاسخ جزئیات اپلیکیشن معتبر نیست.' }, { status: 502 })
    return copyBackendResponse(response, payload || { detail: 'دریافت جزئیات اپلیکیشن انجام نشد.' })
  } catch {
    return NextResponse.json({ detail: 'ارتباط با سرویس اپلیکیشن برقرار نشد. دوباره تلاش کنید.' }, { status: 502 })
  }
}

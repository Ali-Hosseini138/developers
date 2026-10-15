import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function GET() {
  try {
    const response = await developerHubApi('/api/v1/developer-hub/categories/')
    const payload = await response.json().catch(() => null)
    if (!response.ok) return copyBackendResponse(response, payload || { detail: 'دریافت دسته‌بندی‌ها انجام نشد.' })
    if (!Array.isArray(payload)) return NextResponse.json({ detail: 'پاسخ دسته‌بندی‌ها معتبر نیست.' }, { status: 502 })
    return NextResponse.json({ categories: payload })
  } catch {
    return NextResponse.json({ detail: 'ارتباط با سرویس دسته‌بندی برقرار نشد.' }, { status: 502 })
  }
}

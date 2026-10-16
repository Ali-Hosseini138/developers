import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const response = await developerHubApi(`/api/v1/developer-hub/submissions/${encodeURIComponent(id)}/cancel/`, { method: 'POST' })
    const payload = await response.json().catch(() => ({}))
    return copyBackendResponse(response, payload)
  } catch {
    return NextResponse.json({ detail: 'نتیجه لغو درخواست مشخص نیست؛ قبل از تکرار عملیات، وضعیت درخواست را دوباره دریافت کنید.' }, { status: 502 })
  }
}

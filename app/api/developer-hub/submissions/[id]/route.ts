import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const response = await developerHubApi(`/api/v1/developer-hub/submissions/${encodeURIComponent(id)}/`)
    const payload = await response.json().catch(() => ({}))
    return copyBackendResponse(response, payload)
  } catch {
    return NextResponse.json({ detail: 'دریافت وضعیت درخواست انجام نشد؛ دوباره تلاش کنید.' }, { status: 502 })
  }
}

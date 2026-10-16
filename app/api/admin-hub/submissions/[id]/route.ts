import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'
import { copyBackendResponse } from '@/lib/developer-api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  try {
    const response = await adminHubApi(`/api/v1/developer-hub/admin/submissions/${encodeURIComponent(id)}/`)
    const payload = await response.json().catch(() => ({}))
    return copyBackendResponse(response, payload)
  } catch {
    return NextResponse.json({ detail: 'دریافت وضعیت درخواست انجام نشد؛ دوباره تلاش کنید.' }, { status: 502 })
  }
}

import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'
import { copyBackendResponse } from '@/lib/developer-api'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  try {
    const response = await adminHubApi(
      `/api/v1/developer-hub/admin/submissions/${encodeURIComponent(id)}/approve/`,
      { method: 'POST', body: JSON.stringify(body) },
    )
    const payload = await response.json().catch(() => ({}))
    return copyBackendResponse(response, payload)
  } catch {
    return NextResponse.json({ detail: 'نتیجه تأیید درخواست مشخص نیست؛ قبل از تکرار عملیات، وضعیت درخواست را دوباره دریافت کنید.' }, { status: 502 })
  }
}

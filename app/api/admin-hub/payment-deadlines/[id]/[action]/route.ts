import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'
import { copyBackendResponse } from '@/lib/developer-api'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params
  if (!/^\d+$/.test(id) || !['complete', 'deactivate'].includes(action)) {
    return NextResponse.json({ detail: 'عملیات معتبر نیست.' }, { status: 400 })
  }
  try {
    const response = await adminHubApi(`/api/v1/developer-hub/admin/payment-deadlines/${encodeURIComponent(id)}/${action}/`, { method: 'POST' })
    return copyBackendResponse(response, await response.json().catch(() => ({})))
  } catch {
    return NextResponse.json({ detail: 'ثبت عملیات پرداخت انجام نشد.' }, { status: 502 })
  }
}

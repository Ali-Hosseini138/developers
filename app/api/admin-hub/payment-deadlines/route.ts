import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'
import { copyBackendResponse } from '@/lib/developer-api'

export async function GET() {
  try {
    const response = await adminHubApi('/api/v1/developer-hub/admin/payment-deadlines/')
    return copyBackendResponse(response, await response.json().catch(() => ({})))
  } catch {
    return NextResponse.json({ detail: 'ارتباط با صف مهلت پرداخت برقرار نشد.' }, { status: 502 })
  }
}

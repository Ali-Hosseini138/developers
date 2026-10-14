import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => ({}))
  const response = await adminHubApi(
    `/api/v1/developer-hub/admin/submissions/${encodeURIComponent(id)}/reject/`,
    { method: 'POST', body: JSON.stringify(body) },
  )
  const payload = await response.json().catch(() => ({}))
  return NextResponse.json(payload, { status: response.status })
}

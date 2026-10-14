import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const response = await adminHubApi(`/api/v1/developer-hub/admin/submissions/${encodeURIComponent(id)}/`)
  const payload = await response.json().catch(() => ({}))
  return NextResponse.json(payload, { status: response.status })
}

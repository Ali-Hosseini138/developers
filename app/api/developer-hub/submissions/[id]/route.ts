import { NextResponse } from 'next/server'
import { developerHubApi } from '@/lib/developer-api'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const response = await developerHubApi(`/api/v1/developer-hub/submissions/${encodeURIComponent(id)}/`)
  const payload = await response.json().catch(() => ({}))
  return NextResponse.json(payload, { status: response.status })
}

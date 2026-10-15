import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const response = await developerHubApi(`/api/v1/developer-hub/tickets/${encodeURIComponent(id)}/`)
    return copyBackendResponse(response, await response.json())
  } catch { return NextResponse.json({ detail: 'دریافت پاسخ تیکت انجام نشد.' }, { status: 502 }) }
}

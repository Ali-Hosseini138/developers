import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'
import { copyBackendResponse } from '@/lib/developer-api'
import { loadTicketPages } from '@/lib/support-tickets'

export async function GET(request: Request) {
  const status = new URL(request.url).searchParams.get('status') || 'all'
  if (!['all', 'open', 'closed'].includes(status)) return NextResponse.json({ detail: 'وضعیت نامعتبر است.' }, { status: 400 })
  try {
    const response = await loadTicketPages(adminHubApi, `/api/v1/developer-hub/admin/tickets/?status=${status}`)
    return copyBackendResponse(response, await response.json())
  } catch { return NextResponse.json({ detail: 'دریافت صندوق تیکت‌ها انجام نشد.' }, { status: 502 }) }
}

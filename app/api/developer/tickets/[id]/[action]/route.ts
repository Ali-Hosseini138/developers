import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'

export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const { id, action } = await params
  if (!['messages', 'close', 'reopen'].includes(action)) return NextResponse.json({ detail: 'عملیات نامعتبر است.' }, { status: 400 })
  let init: RequestInit = { method: 'POST' }
  if (action === 'messages') {
    let payload
    try { payload = await request.json() } catch { return NextResponse.json({ detail: 'درخواست معتبر نیست.' }, { status: 400 }) }
    const body = typeof payload?.body === 'string' ? payload.body.trim() : ''
    if (!body || body.length > 20000) return NextResponse.json({ detail: 'متن پیام الزامی است و حداکثر ۲۰۰۰۰ نویسه دارد.' }, { status: 400 })
    init = { ...init, body: JSON.stringify({ body }) }
  }
  try {
    const response = await developerHubApi(`/api/v1/developer-hub/tickets/${encodeURIComponent(id)}/${action}/`, init)
    if (response.status === 204) return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } })
    return copyBackendResponse(response, await response.json())
  } catch { return NextResponse.json({ detail: 'نتیجه عملیات مشخص نیست؛ تیکت را پیش از تلاش مجدد تازه کنید.' }, { status: 502 }) }
}

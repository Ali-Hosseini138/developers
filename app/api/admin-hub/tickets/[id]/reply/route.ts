import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'
import { copyBackendResponse } from '@/lib/developer-api'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let body
  try { body = await request.json() } catch { return NextResponse.json({ detail: 'درخواست معتبر نیست.' }, { status: 400 }) }
  const message = typeof body?.body === 'string' ? body.body.trim() : ''
  if (!message || message.length > 20000) return NextResponse.json({ detail: 'پاسخ الزامی است و حداکثر ۲۰۰۰۰ نویسه دارد.' }, { status: 400 })
  const { id } = await params
  try {
    const response = await adminHubApi(`/api/v1/developer-hub/admin/tickets/${encodeURIComponent(id)}/reply/`, { method: 'POST', body: JSON.stringify({ body: message }) })
    return copyBackendResponse(response, await response.json())
  } catch { return NextResponse.json({ detail: 'نتیجه ارسال پاسخ مشخص نیست؛ صندوق را تازه کنید.' }, { status: 502 }) }
}

import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'
import { loadTicketPages } from '@/lib/support-tickets'

export async function GET() {
  try {
    const response = await loadTicketPages(developerHubApi, '/api/v1/developer-hub/tickets/')
    return copyBackendResponse(response, await response.json())
  } catch { return NextResponse.json({ detail: 'دریافت تیکت‌ها انجام نشد؛ دوباره تلاش کنید.' }, { status: 502 }) }
}

export async function POST(request: Request) {
  let body
  try { body = await request.json() } catch { return NextResponse.json({ detail: 'درخواست معتبر نیست.' }, { status: 400 }) }
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : ''
  const question = typeof body?.question === 'string' ? body.question.trim() : ''
  if (!subject || !question || subject.length > 200 || question.length > 10000) {
    return NextResponse.json({ detail: 'موضوع (تا ۲۰۰ نویسه) و توضیحات (تا ۱۰۰۰۰ نویسه) الزامی است.' }, { status: 400 })
  }
  try {
    const response = await developerHubApi('/api/v1/developer-hub/tickets/', { method: 'POST', body: JSON.stringify({ subject, question }) })
    return copyBackendResponse(response, await response.json())
  } catch { return NextResponse.json({ detail: 'نتیجه ارسال تیکت مشخص نیست؛ پیش از ارسال مجدد، فهرست را تازه کنید.' }, { status: 502 }) }
}

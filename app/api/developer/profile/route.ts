import { NextResponse } from 'next/server'
import { developerHubApi, copyBackendResponse } from '@/lib/developer-api'
import { mapDeveloperProfile } from '@/lib/developer-profile'

async function forward(init: RequestInit = {}) {
  try {
    const response = await developerHubApi('/api/v1/developer-hub/profile/', init)
    const payload = await response.json()
    if (!response.ok) return copyBackendResponse(response, payload)
    if (payload?.id == null || typeof payload.email !== 'string') return NextResponse.json({ detail: 'پاسخ پروفایل معتبر نیست.' }, { status: 502 })
    return copyBackendResponse(response, { profile: mapDeveloperProfile(payload) })
  } catch { return NextResponse.json({ detail: 'دریافت یا ذخیره پروفایل انجام نشد؛ دوباره تلاش کنید.' }, { status: 502 }) }
}

export async function GET() { return forward() }

export async function PATCH(request: Request) {
  let body
  try { body = await request.json() } catch { return NextResponse.json({ detail: 'درخواست معتبر نیست.' }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ detail: 'درخواست معتبر نیست.' }, { status: 400 })
  if ('accountType' in body) return NextResponse.json({ detail: 'نوع حساب پس از ثبت‌نام قابل تغییر نیست.' }, { status: 400 })
  const fields = ['firstName', 'lastName', 'mobile', 'identityNumber', 'companyName']
  const patch: Record<string, string> = {}
  for (const key of fields) {
    if (!(key in body)) continue
    if (typeof body[key] !== 'string') return NextResponse.json({ detail: 'مقدار فیلد معتبر نیست.' }, { status: 400 })
    patch[key] = body[key].trim()
  }
  if (!Object.keys(patch).length) return NextResponse.json({ detail: 'فیلد قابل ویرایشی ارسال نشده است.' }, { status: 400 })
  return forward({ method: 'PATCH', body: JSON.stringify(patch) })
}

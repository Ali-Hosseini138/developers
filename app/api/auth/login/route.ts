import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, EMAIL_COOKIE, REFRESH_COOKIE, authCookieOptions, developerApi } from '@/lib/developer-api'
import { OWNER_COOKIE, encodeDeveloperIdentity, ensureDeveloperOwner } from '@/lib/developer-identity'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const response = await developerApi('/api/v1/developers/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ email, password: body.password }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) return NextResponse.json(payload, { status: response.status })

    const access = typeof payload.access === 'string' ? payload.access : ''
    const refresh = typeof payload.refresh === 'string' ? payload.refresh : ''
    if (!access || !refresh) {
      return NextResponse.json({ detail: 'توکن ورود از بک‌اند دریافت نشد.' }, { status: 502 })
    }

    const identity = await ensureDeveloperOwner(email)
    const result = NextResponse.json({
      ok: true,
      user: { id: identity.id, email, name: email.split('@')[0] || 'توسعه‌دهنده' },
      expiresIn: payload.expiresIn ?? 1800,
    })
    result.cookies.set(ACCESS_COOKIE, access, authCookieOptions(Number(payload.expiresIn || 1800)))
    result.cookies.set(REFRESH_COOKIE, refresh, authCookieOptions(7 * 24 * 60 * 60))
    result.cookies.set(EMAIL_COOKIE, email, authCookieOptions(7 * 24 * 60 * 60))
    result.cookies.set(OWNER_COOKIE, encodeDeveloperIdentity(identity), authCookieOptions(7 * 24 * 60 * 60))
    return result
  } catch {
    return NextResponse.json({ detail: 'ارتباط با سرویس ورود برقرار نشد.' }, { status: 502 })
  }
}

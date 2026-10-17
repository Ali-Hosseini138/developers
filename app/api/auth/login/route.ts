import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, EMAIL_COOKIE, REFRESH_COOKIE, authCookieOptions, developerApi } from '@/lib/developer-api'
import { mapDeveloperProfile } from '@/lib/developer-profile'

export async function POST(request: Request) {
  let stage = 'request'
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    stage = 'backend_login'
    const response = await developerApi('/api/v1/developers/auth/login/', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({ email, password: body.password }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) return NextResponse.json(payload, { status: response.status })

    const access = typeof payload.access === 'string' ? payload.access : ''
    const refresh = typeof payload.refresh === 'string' ? payload.refresh : ''
    if (!access || !refresh) {
      return NextResponse.json({ detail: 'توکن ورود از بک‌اند دریافت نشد.' }, { status: 502 })
    }

    stage = 'developer_profile'
    const profileResponse = await developerApi('/api/v1/developer-hub/profile/', {
      headers: { Authorization: `Bearer ${access}` },
    })
    const profile = await profileResponse.json().catch(() => null)
    if (!profileResponse.ok || profile?.id == null || typeof profile.email !== 'string') {
      return NextResponse.json({ detail: 'دریافت اطلاعات حساب از سرویس انجام نشد؛ دوباره تلاش کنید.' }, { status: profileResponse.ok ? 502 : profileResponse.status, headers: { 'Cache-Control': 'private, no-store' } })
    }
    const result = NextResponse.json({ ok: true, user: mapDeveloperProfile(profile), expiresIn: payload.expiresIn ?? 1800 }, { headers: { 'Cache-Control': 'private, no-store' } })
    result.cookies.set(ACCESS_COOKIE, access, authCookieOptions(Number(payload.expiresIn || 1800)))
    result.cookies.set(REFRESH_COOKIE, refresh, authCookieOptions(7 * 24 * 60 * 60))
    // Retire cookies used by the previous identity bridge.
    for (const name of [EMAIL_COOKIE, 'developer_owner']) result.cookies.set(name, '', { path: '/', maxAge: 0 })
    return result
  } catch (error) {
    // Log only transport codes and the stage, never credentials or tokens.
    const failure = error as { name?: string; code?: string; cause?: { code?: string } }
    console.error('developer_login_failed', { stage, name: failure?.name, code: failure?.cause?.code || failure?.code })
    return NextResponse.json({ detail: stage === 'developer_profile'
      ? 'دریافت اطلاعات حساب از سرویس انجام نشد؛ دوباره تلاش کنید.'
      : 'ارتباط با سرویس ورود برقرار نشد. لطفاً کمی بعد دوباره تلاش کنید.' }, { status: 502 })
  }
}

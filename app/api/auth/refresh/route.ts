import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, REFRESH_COOKIE, authCookieOptions, developerApi } from '@/lib/developer-api'

export async function POST() {
  const store = await cookies()
  const refresh = store.get(REFRESH_COOKIE)?.value
  if (!refresh) return NextResponse.json({ detail: 'refresh token موجود نیست.' }, { status: 401 })

  try {
    const response = await developerApi('/api/v1/developers/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok || !payload.access) return NextResponse.json(payload, { status: response.status })

    const result = NextResponse.json({ ok: true, expiresIn: payload.expiresIn ?? 1800 })
    result.cookies.set(ACCESS_COOKIE, payload.access, authCookieOptions(Number(payload.expiresIn || 1800)))
    return result
  } catch {
    return NextResponse.json({ detail: 'تمدید نشست انجام نشد.' }, { status: 502 })
  }
}

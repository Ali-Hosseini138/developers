import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, EMAIL_COOKIE, REFRESH_COOKIE, authCookieOptions, developerApi } from '@/lib/developer-api'

export async function GET() {
  const store = await cookies()
  const refresh = store.get(REFRESH_COOKIE)?.value
  const email = store.get(EMAIL_COOKIE)?.value || ''

  if (!refresh) return NextResponse.json({ authenticated: false }, { status: 401 })

  try {
    const response = await developerApi('/api/v1/developers/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok || !payload.access) {
      const result = NextResponse.json({ authenticated: false }, { status: 401 })
      for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EMAIL_COOKIE]) {
        result.cookies.set(name, '', { path: '/', maxAge: 0 })
      }
      return result
    }

    const result = NextResponse.json({
      authenticated: true,
      user: {
        email,
        name: email.split('@')[0] || 'توسعه‌دهنده',
        termsAcceptedAt: new Date(0).toISOString(),
      },
    })
    result.cookies.set(ACCESS_COOKIE, payload.access, authCookieOptions(Number(payload.expiresIn || 1800)))
    return result
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 502 })
  }
}

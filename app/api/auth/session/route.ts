import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, EMAIL_COOKIE, REFRESH_COOKIE, authCookieOptions, developerApi } from '@/lib/developer-api'
import { OWNER_COOKIE, decodeDeveloperIdentity, encodeDeveloperIdentity, ensureDeveloperOwner } from '@/lib/developer-identity'

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

    // An outage or rate limit is not proof that the user's refresh token is invalid.
    if (!response.ok && ![400, 401, 403].includes(response.status)) {
      return NextResponse.json({ detail: 'سرویس بررسی نشست موقتاً در دسترس نیست.' }, { status: response.status, headers: { 'Cache-Control': 'private, no-store', ...(response.headers.get('Retry-After') ? { 'Retry-After': response.headers.get('Retry-After')! } : {}) } })
    }
    if (response.ok && (typeof payload.access !== 'string' || !payload.access)) return NextResponse.json({ detail: 'پاسخ سرویس نشست معتبر نیست.' }, { status: 502 })
    if (!response.ok || !payload.access) {
      const result = NextResponse.json({ authenticated: false }, { status: 401 })
      for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EMAIL_COOKIE, OWNER_COOKIE]) {
        result.cookies.set(name, '', { path: '/', maxAge: 0 })
      }
      return result
    }

    const currentIdentity = decodeDeveloperIdentity(store.get(OWNER_COOKIE)?.value)
    const identity = currentIdentity?.email === email ? currentIdentity : await ensureDeveloperOwner(email)

    const result = NextResponse.json({
      authenticated: true,
      user: {
        id: identity.id,
        email,
        name: email.split('@')[0] || 'توسعه‌دهنده',
        termsAcceptedAt: new Date(0).toISOString(),
      },
    })
    result.headers.set('Cache-Control', 'private, no-store')
    result.cookies.set(ACCESS_COOKIE, payload.access, authCookieOptions(Number(payload.expiresIn || 1800)))
    result.cookies.set(OWNER_COOKIE, encodeDeveloperIdentity(identity), authCookieOptions(7 * 24 * 60 * 60))
    return result
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 502 })
  }
}

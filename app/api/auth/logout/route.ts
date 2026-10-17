import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, EMAIL_COOKIE, REFRESH_COOKIE, developerApi } from '@/lib/developer-api'

export async function POST() {
  const store = await cookies()
  const access = store.get(ACCESS_COOKIE)?.value

  if (access) {
    try {
      await developerApi('/api/v1/developers/auth/logout/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}` },
      })
    } catch {
      // Cookies are still cleared locally if the backend cannot be reached.
    }
  }

  const result = NextResponse.json({ ok: true })
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, EMAIL_COOKIE, 'developer_owner']) {
    result.cookies.set(name, '', { path: '/', maxAge: 0 })
  }
  return result
}

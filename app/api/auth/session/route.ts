import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ACCESS_COOKIE, EMAIL_COOKIE } from '@/lib/developer-api'

export async function GET() {
  const store = await cookies()
  const access = store.get(ACCESS_COOKIE)?.value
  const email = store.get(EMAIL_COOKIE)?.value || ''
  if (!access) return NextResponse.json({ authenticated: false }, { status: 401 })

  return NextResponse.json({
    authenticated: true,
    user: {
      email,
      name: email.split('@')[0] || 'توسعه‌دهنده',
      termsAcceptedAt: new Date(0).toISOString(),
    },
  })
}

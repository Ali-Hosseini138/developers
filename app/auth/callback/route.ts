import { NextResponse } from 'next/server'
import { safeInternalPath } from '@/lib/safe-navigation'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const next = safeInternalPath(url.searchParams.get('next'))
  if (url.searchParams.has('code')) {
    return NextResponse.redirect(new URL(next === '/reset-password' ? '/forgot-password?error=expired' : '/login?result=failed', url.origin))
  }
  return NextResponse.redirect(new URL(next, url.origin))
}

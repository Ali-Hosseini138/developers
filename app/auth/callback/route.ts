import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function safeInternalPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard'
  return value
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const next = safeInternalPath(url.searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      const fallback = next === '/reset-password' ? '/forgot-password?error=expired' : '/login?error=callback'
      return NextResponse.redirect(new URL(fallback, url.origin))
    }
  }

  return NextResponse.redirect(new URL(next, url.origin))
}

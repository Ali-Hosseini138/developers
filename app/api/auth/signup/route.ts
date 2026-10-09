import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body.password === 'string' ? body.password : ''

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: body.metadata ?? {},
    })

    if (error) {
      const message = error.message.toLowerCase()
      if (message.includes('already') || message.includes('registered') || message.includes('exists')) {
        return NextResponse.json({ error: 'already_registered' }, { status: 409 })
      }
      return NextResponse.json({ error: 'signup_failed' }, { status: 400 })
    }

    return NextResponse.json({ id: data.user.id })
  } catch {
    return NextResponse.json({ error: 'signup_failed' }, { status: 500 })
  }
}

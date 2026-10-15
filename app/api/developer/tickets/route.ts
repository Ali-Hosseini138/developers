import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'

export async function GET() {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .select('id, subject, message, status, created_at, updated_at, admin_reply, replied_at, messages')
    .eq('user_id', identity.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'tickets_load_failed' }, { status: 500 })
  return NextResponse.json({ tickets: data || [] })
}

export async function POST(request: Request) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const message = typeof body.message === 'string' ? body.message.trim() : ''

  if (subject.length < 2 || message.length < 2) {
    return NextResponse.json({ error: 'ticket_fields_required' }, { status: 400 })
  }

  if (subject.length > 200 || message.length > 10000) {
    return NextResponse.json({ error: 'ticket_too_long' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('support_tickets')
    .insert({ user_id: identity.id, subject, message, status: 'open' })
    .select('id, subject, message, status, created_at, updated_at, admin_reply, replied_at, messages')
    .single()

  if (error) return NextResponse.json({ error: 'ticket_create_failed' }, { status: 500 })
  return NextResponse.json({ ticket: data }, { status: 201 })
}

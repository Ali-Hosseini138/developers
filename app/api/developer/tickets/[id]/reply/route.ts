import { NextResponse } from 'next/server'
import { getDeveloperIdentity } from '@/lib/developer-identity'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return NextResponse.json({ error: 'ticket_not_found' }, { status: 404 })
  const body = await request.json().catch(() => null)
  const action = body?.action
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  if (!['reply', 'resolve'].includes(action) || (action === 'reply' && (message.length < 2 || message.length > 10000))) {
    return NextResponse.json({ error: 'invalid_ticket_message' }, { status: 400 })
  }
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('append_support_ticket_message', {
    p_ticket_id: id, p_owner_id: identity.id, p_actor: 'developer', p_action: action, p_body: message,
  })
  if (error) return NextResponse.json({ error: error.message === 'ticket_not_found' ? 'ticket_not_found' : 'ticket_reply_failed' }, { status: error.message === 'ticket_not_found' ? 404 : 500 })
  const ticket = Array.isArray(data) ? data[0] : data
  if (!ticket || ticket.id !== id) return NextResponse.json({ error: 'ticket_reply_failed' }, { status: 502 })
  return NextResponse.json({ ticket })
}

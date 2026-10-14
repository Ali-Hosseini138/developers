import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'

export async function GET() {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, phone, national_id, organization, terms_accepted_at')
    .eq('id', identity.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'profile_load_failed' }, { status: 500 })

  return NextResponse.json({
    profile: {
      id: identity.id,
      email: identity.email,
      name: data?.full_name || identity.email.split('@')[0] || 'توسعه‌دهنده',
      phone: data?.phone || '',
      nationalId: data?.national_id || '',
      organization: data?.organization || '',
      termsAcceptedAt: data?.terms_accepted_at || null,
    },
  })
}

export async function PATCH(request: Request) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const phone = typeof body.phone === 'string' ? body.phone.trim() : undefined
  const nationalId = typeof body.nationalId === 'string' ? body.nationalId.trim() : undefined
  const organization = typeof body.organization === 'string' ? body.organization.trim() : undefined
  const acceptTerms = body.acceptTerms === true

  if (name !== undefined && !name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }

  if (nationalId && !/^\d{10,11}$/.test(nationalId)) {
    return NextResponse.json({ error: 'invalid_national_id' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined) patch.full_name = name
  if (phone !== undefined) patch.phone = phone || null
  if (nationalId !== undefined) patch.national_id = nationalId || null
  if (organization !== undefined) patch.organization = organization || null
  if (acceptTerms) patch.terms_accepted_at = new Date().toISOString()

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: identity.id, ...patch }, { onConflict: 'id' })
    .select('id, full_name, phone, national_id, organization, terms_accepted_at')
    .single()

  if (error) return NextResponse.json({ error: 'profile_update_failed' }, { status: 500 })

  return NextResponse.json({
    profile: {
      id: identity.id,
      email: identity.email,
      name: data.full_name || identity.email.split('@')[0] || 'توسعه‌دهنده',
      phone: data.phone || '',
      nationalId: data.national_id || '',
      organization: data.organization || '',
      termsAcceptedAt: data.terms_accepted_at || null,
    },
  })
}

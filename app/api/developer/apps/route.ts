import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'

export async function GET() {
  const identity = await getDeveloperIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('apps')
    .select('*')
    .eq('owner_id', identity.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'apps_load_failed' }, { status: 500 })
  }

  return NextResponse.json({ apps: data || [] })
}

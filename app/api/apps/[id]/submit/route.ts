import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { data: app, error: readError } = await supabase
    .from('apps')
    .select('id, owner_id, status, name, tagline, description, category, package_name, apk_path, icon_path, banner_path')
    .eq('id', id)
    .eq('owner_id', user.id)
    .maybeSingle()

  if (readError) {
    return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  }

  if (!app) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!['draft', 'rejected'].includes(app.status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 409 })
  }

  const missing: string[] = []
  if (!app.name?.trim()) missing.push('name')
  if (!app.tagline?.trim()) missing.push('tagline')
  if (!app.description?.trim()) missing.push('description')
  if (!app.category?.trim()) missing.push('category')
  if (!app.package_name?.trim()) missing.push('package_name')
  if (!app.apk_path?.trim()) missing.push('apk')
  if (!app.icon_path?.trim()) missing.push('icon')
  if (!app.banner_path?.trim()) missing.push('banner')

  if (missing.length > 0) {
    return NextResponse.json({ error: 'incomplete_app', missing }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('apps')
    .update({
      status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('owner_id', user.id)
    .in('status', ['draft', 'rejected'])
    .select('id, status, updated_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, app: data })
}

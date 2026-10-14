import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'
import { CATEGORIES } from '@/lib/types'

const packageNamePattern = /^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/
const allowedAgeRestrictions = new Set(['همه سنین', '+۷', '+۱۲', '+۱۵', '+۱۸'])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()
  const { data: current, error: readError } = await supabase
    .from('apps')
    .select('*')
    .eq('id', id)
    .eq('owner_id', identity.id)
    .maybeSingle()

  if (readError) return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (current.status === 'pending') return NextResponse.json({ error: 'app_under_review' }, { status: 409 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }

  const textField = (key: string, column: string, nullable = false) => {
    if (!(key in body)) return
    const value = typeof body[key] === 'string' ? body[key].trim() : ''
    patch[column] = nullable ? value || null : value
  }

  textField('name', 'name')
  textField('nameEn', 'name_en', true)
  textField('tagline', 'tagline')
  textField('taglineEn', 'tagline_en', true)
  textField('description', 'description')
  textField('descriptionEn', 'description_en', true)
  textField('website', 'website', true)
  textField('supportEmail', 'support_email', true)

  if ('category' in body) {
    const category = typeof body.category === 'string' ? body.category.trim() : ''
    if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
    }
    patch.category = category
  }

  if ('ageRestriction' in body) {
    const value = typeof body.ageRestriction === 'string' ? body.ageRestriction.trim() : ''
    if (!allowedAgeRestrictions.has(value)) {
      return NextResponse.json({ error: 'invalid_age_restriction' }, { status: 400 })
    }
    patch.age_restriction = value
  }

  if ('packageName' in body) {
    const value = typeof body.packageName === 'string' ? body.packageName.trim() : ''
    if (!packageNamePattern.test(value)) {
      return NextResponse.json({ error: 'invalid_package_name' }, { status: 400 })
    }
    if (current.status === 'published' && value !== current.package_name) {
      return NextResponse.json({ error: 'package_name_locked' }, { status: 409 })
    }
    patch.package_name = value
  }

  const ownerPrefix = `users/${identity.id}/`
  for (const [key, column] of [['iconPath', 'icon_path'], ['bannerPath', 'banner_path']] as const) {
    if (!(key in body)) continue
    const value = typeof body[key] === 'string' ? body[key].trim() : ''
    if (value && !value.startsWith(ownerPrefix)) {
      return NextResponse.json({ error: 'invalid_upload_path' }, { status: 400 })
    }
    patch[column] = value || null
    patch[column === 'icon_path' ? 'icon_url' : 'banner_url'] = null
  }

  if ('screenshotPaths' in body) {
    if (!Array.isArray(body.screenshotPaths)) {
      return NextResponse.json({ error: 'invalid_screenshots' }, { status: 400 })
    }
    const paths = body.screenshotPaths
      .filter((value): value is string => typeof value === 'string' && Boolean(value))
      .slice(0, 20)
    if (paths.some((value) => !value.startsWith(ownerPrefix))) {
      return NextResponse.json({ error: 'invalid_upload_path' }, { status: 400 })
    }
    patch.screenshot_paths = [...new Set(paths)]
  }

  if (typeof patch.name === 'string' && !patch.name) {
    return NextResponse.json({ error: 'name_required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('apps')
    .update(patch)
    .eq('id', id)
    .eq('owner_id', identity.id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ app: data })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()
  const { data: app, error: readError } = await supabase
    .from('apps')
    .select('id, status')
    .eq('id', id)
    .eq('owner_id', identity.id)
    .maybeSingle()

  if (readError) return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (!['draft', 'rejected'].includes(app.status)) {
    return NextResponse.json({ error: 'delete_not_allowed' }, { status: 409 })
  }

  const { error } = await supabase
    .from('apps')
    .delete()
    .eq('id', id)
    .eq('owner_id', identity.id)

  if (error) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

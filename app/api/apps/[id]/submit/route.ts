import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'
import { buildAppReviewSnapshot } from '@/lib/review-submission'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  const supabase = createAdminClient()

  const { data: app, error: readError } = await supabase
    .from('apps')
    .select('*')
    .eq('id', id)
    .eq('owner_id', identity.id)
    .maybeSingle()

  if (readError) return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 })

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

  const previousStatus = app.status
  const previousUpdatedAt = app.updated_at
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('apps')
    .update({
      status: 'pending',
      review_reason: null,
      reviewed_at: null,
      updated_at: now,
    })
    .eq('id', id)
    .eq('owner_id', identity.id)
    .in('status', ['draft', 'rejected'])
    .select('id, status, updated_at')
    .single()

  if (error) return NextResponse.json({ error: 'update_failed' }, { status: 500 })

  const { error: submissionError } = await supabase
    .from('review_submissions')
    .insert({
      app_id: app.id,
      request_type: 'app',
      submitted_by: identity.id,
      snapshot: buildAppReviewSnapshot({ ...app, status: 'pending', review_reason: null, reviewed_at: null }),
      status: 'pending',
    })

  if (submissionError) {
    await supabase
      .from('apps')
      .update({
        status: previousStatus,
        updated_at: previousUpdatedAt,
      })
      .eq('id', app.id)
      .eq('owner_id', identity.id)

    return NextResponse.json({ error: 'submission_snapshot_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, app: data })
}

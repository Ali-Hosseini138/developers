import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'
import { buildVersionReviewSnapshot } from '@/lib/review-submission'

const MAX_APK_SIZE = 250 * 1024 * 1024

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const identity = await getDeveloperIdentity()
  if (!identity) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { id } = await params
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const pathname = typeof body.apk?.pathname === 'string' ? body.apk.pathname : ''
  const name = typeof body.apk?.name === 'string' ? body.apk.name : ''
  const size = Number(body.apk?.size || 0)
  const packageName = typeof body.packageName === 'string' ? body.packageName.trim() : ''
  const changelog = typeof body.changelog === 'string' ? body.changelog.trim() : ''

  if (!pathname || !name || !size || !changelog) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }
  if (!name.toLowerCase().endsWith('.apk')) {
    return NextResponse.json({ error: 'invalid_apk_file' }, { status: 400 })
  }
  if (size > MAX_APK_SIZE) {
    return NextResponse.json({ error: 'apk_too_large' }, { status: 400 })
  }
  if (!pathname.startsWith(`users/${identity.id}/`)) {
    return NextResponse.json({ error: 'invalid_upload_path' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: app, error: appError } = await supabase
    .from('apps')
    .select('id, status, package_name')
    .eq('id', id)
    .eq('owner_id', identity.id)
    .maybeSingle()

  if (appError) return NextResponse.json({ error: 'read_failed' }, { status: 500 })
  if (!app) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (app.status !== 'published') {
    return NextResponse.json({ error: 'app_not_published' }, { status: 409 })
  }
  if (app.package_name && packageName && packageName !== app.package_name) {
    return NextResponse.json({ error: 'package_name_mismatch' }, { status: 400 })
  }

  const { data: pendingVersion, error: pendingError } = await supabase
    .from('app_versions')
    .select('id')
    .eq('app_id', id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (pendingError) return NextResponse.json({ error: 'version_check_failed' }, { status: 500 })
  if (pendingVersion) {
    return NextResponse.json({ error: 'version_under_review' }, { status: 409 })
  }

  const { data: version, error } = await supabase
    .from('app_versions')
    .insert({
      app_id: id,
      apk_url: `/api/blob-file?pathname=${encodeURIComponent(pathname)}`,
      apk_path: pathname,
      apk_name: name,
      apk_size: size,
      package_name: packageName || app.package_name || null,
      changelog,
      status: 'pending',
    })
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: 'version_create_failed' }, { status: 500 })

  const { error: submissionError } = await supabase
    .from('review_submissions')
    .insert({
      app_id: id,
      version_id: version.id,
      request_type: 'version',
      submitted_by: identity.id,
      snapshot: buildVersionReviewSnapshot(version),
      status: 'pending',
    })

  if (submissionError) {
    await supabase.from('app_versions').delete().eq('id', version.id).eq('app_id', id)
    return NextResponse.json({ error: 'submission_snapshot_failed' }, { status: 500 })
  }

  return NextResponse.json({ version }, { status: 201 })
}

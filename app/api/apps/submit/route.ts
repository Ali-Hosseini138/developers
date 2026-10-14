import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDeveloperIdentity } from '@/lib/developer-identity'
import { CATEGORIES } from '@/lib/types'
import { buildAppReviewSnapshot } from '@/lib/review-submission'

const packageNamePattern = /^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/
const allowedAgeRestrictions = new Set(['همه سنین', '+۷', '+۱۲', '+۱۵', '+۱۸'])

type SubmitBody = {
  name?: string
  nameEn?: string
  tagline?: string
  taglineEn?: string
  description?: string
  descriptionEn?: string
  hasInAppPayment?: boolean
  netboxPaymentIntegrated?: boolean
  netboxPaymentGraceAccepted?: boolean
  developedForAndroidTv?: boolean
  airMouseCompatible?: boolean
  category?: string
  ageRestriction?: string
  packageName?: string
  website?: string
  supportEmail?: string
  apk?: { pathname?: string; name?: string; size?: number }
  icon?: { pathname?: string }
  banner?: { pathname?: string }
  screenshots?: Array<{ pathname?: string }>
}

export async function POST(request: Request) {
  const identity = await getDeveloperIdentity()
  if (!identity) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()

  let body: SubmitBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const name = body.name?.trim()
  const nameEn = body.nameEn?.trim() || null
  const tagline = body.tagline?.trim()
  const taglineEn = body.taglineEn?.trim() || null
  let description = body.description?.trim()
  const descriptionEn = body.descriptionEn?.trim() || null
  const category = body.category?.trim()
  const packageName = body.packageName?.trim()
  const website = body.website?.trim() || null
  const supportEmail = body.supportEmail?.trim() || null
  const ageRestriction = body.ageRestriction?.trim()

  if (!name || !tagline || !description || !category || !packageName || !ageRestriction) {
    return NextResponse.json({ error: 'missing_required_fields' }, { status: 400 })
  }

  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    return NextResponse.json({ error: 'invalid_category' }, { status: 400 })
  }

  if (!packageNamePattern.test(packageName)) {
    return NextResponse.json({ error: 'invalid_package_name' }, { status: 400 })
  }

  if (!allowedAgeRestrictions.has(ageRestriction)) {
    return NextResponse.json({ error: 'invalid_age_restriction' }, { status: 400 })
  }

  if (typeof body.hasInAppPayment !== 'boolean' || typeof body.developedForAndroidTv !== 'boolean') {
    return NextResponse.json({ error: 'missing_eligibility_answers' }, { status: 400 })
  }

  if (body.hasInAppPayment && body.netboxPaymentIntegrated !== true && body.netboxPaymentGraceAccepted !== true) {
    return NextResponse.json({ error: 'payment_required' }, { status: 400 })
  }

  if (!body.developedForAndroidTv) {
    if (body.airMouseCompatible !== true) {
      return NextResponse.json({ error: 'tv_compatibility_required' }, { status: 400 })
    }
    const notice = 'این اپ با ایرماوس یا ماوس قابل استفاده است.'
    if (!description.startsWith(notice)) {
      description = `${notice}\n\n${description}`
    }
  }

  if (!body.apk?.pathname || !body.apk?.name || !body.apk?.size || !body.icon?.pathname || !body.banner?.pathname) {
    return NextResponse.json({ error: 'missing_uploaded_files' }, { status: 400 })
  }

  const screenshotPaths = (body.screenshots || [])
    .map((item) => item.pathname)
    .filter((value): value is string => Boolean(value))
    .slice(0, 20)

  const { data, error } = await supabase
    .from('apps')
    .insert({
      owner_id: identity.id,
      name,
      name_en: nameEn,
      tagline,
      tagline_en: taglineEn,
      description,
      description_en: descriptionEn,
      category,
      age_restriction: ageRestriction,
      package_name: packageName,
      has_in_app_payment: body.hasInAppPayment,
      netbox_payment_integrated: body.hasInAppPayment ? body.netboxPaymentIntegrated === true : false,
      netbox_payment_grace_accepted: body.hasInAppPayment ? body.netboxPaymentGraceAccepted === true : false,
      netbox_payment_grace_deadline: null,
      developed_for_android_tv: body.developedForAndroidTv,
      air_mouse_compatible: body.developedForAndroidTv ? false : body.airMouseCompatible === true,
      website,
      support_email: supportEmail,
      status: 'pending',
      apk_path: body.apk.pathname,
      apk_name: body.apk.name,
      apk_size: body.apk.size,
      icon_path: body.icon.pathname,
      banner_path: body.banner.pathname,
      screenshot_paths: screenshotPaths,
      icon_url: null,
      banner_url: null,
    })
    .select('id, status')
    .single()

  if (error) {
    return NextResponse.json(
      { error: 'database_insert_failed', message: error.message },
      { status: 500 },
    )
  }

  const { data: savedApp, error: savedAppError } = await supabase
    .from('apps')
    .select('*')
    .eq('id', data.id)
    .single()

  if (savedAppError) {
    return NextResponse.json({ error: 'submission_snapshot_failed' }, { status: 500 })
  }

  const { error: submissionError } = await supabase
    .from('review_submissions')
    .insert({
      app_id: data.id,
      request_type: 'app',
      submitted_by: identity.id,
      snapshot: buildAppReviewSnapshot(savedApp),
      status: 'pending',
    })

  if (submissionError) {
    await supabase
      .from('apps')
      .update({ status: 'draft', updated_at: new Date().toISOString() })
      .eq('id', data.id)
      .eq('owner_id', identity.id)

    return NextResponse.json({ error: 'submission_snapshot_failed', appId: data.id }, { status: 500 })
  }

  return NextResponse.json({ ok: true, appId: data.id, status: data.status })
}

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminSession, destroyAdminSession, isAdmin, verifyAdminPassword } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

const allowedReviewStatuses = new Set(['published', 'rejected'])

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get('password') || '')
  if (!verifyAdminPassword(password)) {
    return { error: 'رمز عبور مدیر نادرست است.' }
  }
  await createAdminSession()
  redirect('/admin')
}

export async function logoutAction() {
  await destroyAdminSession()
  redirect('/admin/login')
}

export async function updateAppStatusAction(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login')

  const appId = String(formData.get('appId') || '')
  const status = String(formData.get('status') || '')
  const reason = String(formData.get('reason') || '').trim()
  if (!appId || !allowedReviewStatuses.has(status)) return
  if (status === 'rejected' && reason.length < 5) {
    throw new Error('برای رد اپ، دلیل بررسی الزامی است.')
  }

  const reviewedAt = new Date().toISOString()
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('apps')
    .update({
      status,
      review_reason: status === 'rejected' ? reason : null,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq('id', appId)

  if (error) throw error

  await supabase
    .from('review_submissions')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason : null,
      reviewed_at: reviewedAt,
    })
    .eq('app_id', appId)
    .eq('request_type', 'app')
    .eq('status', 'pending')

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

export async function updateVersionStatusAction(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login')

  const versionId = String(formData.get('versionId') || '')
  const status = String(formData.get('status') || '')
  const reason = String(formData.get('reason') || '').trim()
  if (!versionId || !allowedReviewStatuses.has(status)) return
  if (status === 'rejected' && reason.length < 5) {
    throw new Error('برای رد نسخه، دلیل بررسی الزامی است.')
  }

  const reviewedAt = new Date().toISOString()
  const supabase = createAdminClient()
  const { data: version, error: versionError } = await supabase
    .from('app_versions')
    .select('id, app_id, apk_path, apk_name, package_name')
    .eq('id', versionId)
    .single()

  if (versionError) throw versionError

  const { error: updateError } = await supabase
    .from('app_versions')
    .update({
      status,
      review_reason: status === 'rejected' ? reason : null,
      reviewed_at: reviewedAt,
    })
    .eq('id', versionId)

  if (updateError) throw updateError

  await supabase
    .from('review_submissions')
    .update({
      status,
      rejection_reason: status === 'rejected' ? reason : null,
      reviewed_at: reviewedAt,
    })
    .eq('version_id', versionId)
    .eq('status', 'pending')

  if (status === 'published') {
    const appPatch: Record<string, unknown> = {
      apk_path: version.apk_path,
      apk_name: version.apk_name,
      updated_at: reviewedAt,
      status: 'published',
      review_reason: null,
      reviewed_at: reviewedAt,
    }

    if (version.package_name) appPatch.package_name = version.package_name

    const { error: appError } = await supabase
      .from('apps')
      .update(appPatch)
      .eq('id', version.app_id)

    if (appError) throw appError
  }

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}


export async function updateSupportTicketAction(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login')

  const ticketId = String(formData.get('ticketId') || '')
  const action = String(formData.get('action') || '')
  const reply = String(formData.get('reply') || '').trim()

  if (!ticketId || !['reply', 'close', 'reopen'].includes(action)) return
  if (action === 'reply' && reply.length < 2) {
    throw new Error('متن پاسخ نمی‌تواند خالی باشد.')
  }

  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const patch =
    action === 'reply'
      ? { admin_reply: reply, replied_at: now, status: 'answered', updated_at: now }
      : action === 'close'
        ? { status: 'closed', updated_at: now }
        : { status: 'open', updated_at: now }

  const { error } = await supabase
    .from('support_tickets')
    .update(patch)
    .eq('id', ticketId)

  if (error) throw error

  revalidatePath('/admin')
  revalidatePath('/dashboard')
}

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
  if (!appId || !allowedReviewStatuses.has(status)) return

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('apps')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', appId)

  if (error) throw error
  revalidatePath('/admin')
}

export async function updateVersionStatusAction(formData: FormData) {
  if (!(await isAdmin())) redirect('/admin/login')

  const versionId = String(formData.get('versionId') || '')
  const status = String(formData.get('status') || '')
  if (!versionId || !allowedReviewStatuses.has(status)) return

  const supabase = createAdminClient()
  const { data: version, error: versionError } = await supabase
    .from('app_versions')
    .select('id, app_id, apk_path, apk_name, package_name')
    .eq('id', versionId)
    .single()

  if (versionError) throw versionError

  const { error: updateError } = await supabase
    .from('app_versions')
    .update({ status })
    .eq('id', versionId)

  if (updateError) throw updateError

  if (status === 'published') {
    const appPatch: Record<string, unknown> = {
      apk_path: version.apk_path,
      apk_name: version.apk_name,
      updated_at: new Date().toISOString(),
      status: 'published',
    }

    if (version.package_name) appPatch.package_name = version.package_name

    const { error: appError } = await supabase
      .from('apps')
      .update(appPatch)
      .eq('id', version.app_id)

    if (appError) throw appError
  }

  revalidatePath('/admin')
}

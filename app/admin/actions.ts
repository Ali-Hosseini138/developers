'use server'

import { redirect } from 'next/navigation'
import { createAdminSession, destroyAdminSession, verifyAdminPassword } from '@/lib/admin-auth'

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

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { developerApi } from '@/lib/developer-api'
import { destroyAdminSession, getAdminUser, setAdminSession } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'

function backendMessage(payload: any, fallback: string) {
  if (payload?.message) return String(payload.message)
  if (payload?.detail) return String(payload.detail)
  if (payload && typeof payload === 'object') {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value) && value.length) return String(value[0])
    }
  }
  return fallback
}

export async function loginAction(_prev: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get('username') || '').trim()
  const password = String(formData.get('password') || '')

  if (!username || !password) {
    return { error: 'نام کاربری و گذرواژه را وارد کنید.' }
  }

  try {
    const response = await developerApi('/api/v1/developer-hub/admin/auth/login/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      return { error: backendMessage(payload, 'ورود مدیر انجام نشد.') }
    }

    if (typeof payload.access !== 'string' || typeof payload.refresh !== 'string') {
      return { error: 'توکن ورود مدیر از بک‌اند دریافت نشد.' }
    }

    await setAdminSession(payload.access, payload.refresh, Number(payload.expiresIn || 1800))
  } catch {
    return { error: 'ارتباط با سرویس ادمین برقرار نشد.' }
  }

  redirect('/admin')
}

export async function logoutAction() {
  await destroyAdminSession()
  redirect('/admin/login')
}

export async function updateSupportTicketAction(formData: FormData) {
  const admin = await getAdminUser()
  if (!admin) redirect('/admin/login')

  const ticketId = String(formData.get('ticketId') || '')
  const action = String(formData.get('action') || '')
  const reply = String(formData.get('reply') || '').trim()

  if (!ticketId || !['reply', 'close', 'reopen'].includes(action)) return
  if (action === 'reply' && reply.length < 2) {
    throw new Error('متن پاسخ نمی‌تواند خالی باشد.')
  }

  const supabase = createAdminClient()
  if (reply.length > 10000) throw new Error('متن پاسخ نباید بیشتر از ۱۰۰۰۰ نویسه باشد.')
  const { error } = await supabase.rpc('append_support_ticket_message', {
    p_ticket_id: ticketId, p_owner_id: null, p_actor: 'support', p_action: action, p_body: reply,
  })

  if (error) throw error
  revalidatePath('/admin')
}

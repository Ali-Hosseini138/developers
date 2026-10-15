import { redirect } from 'next/navigation'
import { getAdminUser, adminHubApi } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logoutAction } from './actions'
import { Button } from '@/components/ui/button'
import { AdminConsole } from '@/components/admin/admin-console'
import type { TicketMessage } from '@/lib/types'
import type { AdminSubmissionListItem } from '@/lib/admin-hub-model'

export const metadata = { title: 'پنل مدیریت — نت‌استور' }
export const dynamic = 'force-dynamic'

export type AdminSupportTicket = {
  id: string
  messages: TicketMessage[]
  user_id: string
  subject: string
  message: string
  status: 'open' | 'answered' | 'closed'
  created_at: string
  updated_at: string
  admin_reply: string | null
  replied_at: string | null
  developer: string
  developer_email: string | null
}

export default async function AdminPage() {
  const adminUser = await getAdminUser()
  if (!adminUser) redirect('/admin/login')

  const submissions: AdminSubmissionListItem[] = []
  let submissionsError = ''
  let sessionExpired = false
  try {
    for (let page = 1; ; page++) {
      const response = await adminHubApi(`/api/v1/developer-hub/admin/submissions/?page=${page}&page_size=200&ordering=submitted_at`)
      if (response.status === 401) { sessionExpired = true; break }
      if (!response.ok) throw new Error('queue_unavailable')
      const payload = await response.json()
      if (!Array.isArray(payload.results)) throw new Error('queue_invalid')
      submissions.push(...payload.results)
      if (!payload.next || !payload.results.length) break
    }
  } catch {
    submissions.length = 0
    submissionsError = 'دریافت صف بررسی انجام نشد؛ صفحه را تازه کنید.'
  }

  if (sessionExpired) redirect('/admin/login')
  const supabase = createAdminClient()
  const [{ data: tickets }, { data: profiles }] = await Promise.all([
    supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name'),
  ])

  const ownerIds = [...new Set((tickets || []).map((row: Record<string, any>) => row.user_id).filter(Boolean))]
  const authUsers = new Map<string, string | null>()
  for (const ownerId of ownerIds) {
    const { data } = await supabase.auth.admin.getUserById(ownerId)
    authUsers.set(ownerId, data.user?.email || null)
  }

  const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]))
  const adminTickets: AdminSupportTicket[] = (tickets || []).map((row: Record<string, any>) => ({
    id: row.id,
    messages: Array.isArray(row.messages) ? row.messages : [],
    user_id: row.user_id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    admin_reply: row.admin_reply,
    replied_at: row.replied_at,
    developer: profileMap.get(row.user_id) || 'ناشناس',
    developer_email: authUsers.get(row.user_id) || null,
  }))

  const stats = [
    { label: 'در انتظار بررسی', value: submissions.filter((item) => item.status === 'pending_review').length },
    { label: 'در حال پردازش', value: submissions.filter((item) => item.status === 'uploaded' || item.status === 'parsing').length },
    { label: 'خطای فایل', value: submissions.filter((item) => item.status === 'parse_failed').length },
    { label: 'منتشر شده', value: submissions.filter((item) => item.status === 'approved').length },
    { label: 'رد شده', value: submissions.filter((item) => item.status === 'rejected').length },
    { label: 'تیکت‌ها', value: adminTickets.length },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">NetStore Review Center</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">پنل مدیریت نت‌استور</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {adminUser.username}
            {adminUser.canReviewSubmission ? ' · مجاز به تأیید و رد درخواست‌ها' : ' · دسترسی مشاهده'}
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">خروج مدیر</Button>
        </form>
      </header>

      {submissionsError && <p role="alert" className="mb-4 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{submissionsError}</p>}
      <AdminConsole
        submissions={submissions}
        stats={stats}
        tickets={adminTickets}
        canReviewSubmission={adminUser.canReviewSubmission}
      />
    </main>
  )
}

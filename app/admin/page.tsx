import { redirect } from 'next/navigation'
import { getAdminUser, adminHubApi } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logoutAction } from './actions'
import { Button } from '@/components/ui/button'
import { AdminConsole } from '@/components/admin/admin-console'
import type { AdminSubmissionListItem } from '@/lib/admin-hub-model'

export const metadata = { title: 'پنل مدیریت — نت‌استور' }
export const dynamic = 'force-dynamic'

export type AdminSupportTicket = {
  id: string
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

  const submissionsResponse = await adminHubApi(
    '/api/v1/developer-hub/admin/submissions/?page=1&page_size=200&ordering=submitted_at',
  )
  const submissionsPayload = await submissionsResponse.json().catch(() => ({}))
  const submissions: AdminSubmissionListItem[] = Array.isArray(submissionsPayload?.results)
    ? submissionsPayload.results
    : []

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

      <AdminConsole
        submissions={submissions}
        stats={stats}
        tickets={adminTickets}
        canReviewSubmission={adminUser.canReviewSubmission}
      />
    </main>
  )
}

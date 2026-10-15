import { redirect } from 'next/navigation'
import { getAdminUser, adminHubApi } from '@/lib/admin-auth'
import { loadTicketPages } from '@/lib/support-tickets'
import { logoutAction } from './actions'
import { Button } from '@/components/ui/button'
import { AdminConsole } from '@/components/admin/admin-console'
import type { AdminSupportTicket } from '@/lib/types'
import type { AdminSubmissionListItem } from '@/lib/admin-hub-model'

export const metadata = { title: 'پنل مدیریت — نت‌استور' }
export const dynamic = 'force-dynamic'

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
  let adminTickets: AdminSupportTicket[] = []
  let ticketsError = ''
  try {
    const response = await loadTicketPages(adminHubApi, '/api/v1/developer-hub/admin/tickets/?status=all')
    if (response.status === 401) sessionExpired = true
    else if (!response.ok) throw new Error('tickets_unavailable')
    else adminTickets = (await response.json()).tickets
  } catch { ticketsError = 'دریافت صندوق تیکت‌ها انجام نشد؛ دوباره تلاش کنید.' }
  if (sessionExpired) redirect('/admin/login')

  const stats = [
    { label: 'در انتظار بررسی', value: submissions.filter((item) => item.status === 'pending_review').length },
    { label: 'در حال پردازش', value: submissions.filter((item) => item.status === 'uploaded' || item.status === 'parsing').length },
    { label: 'خطای فایل', value: submissions.filter((item) => item.status === 'parse_failed').length },
    { label: 'منتشر شده', value: submissions.filter((item) => item.status === 'approved').length },
    { label: 'رد شده', value: submissions.filter((item) => item.status === 'rejected').length },
    ...(!ticketsError ? [{ label: 'تیکت‌ها', value: adminTickets.length }] : []),
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
        ticketsError={ticketsError}
        canReviewSubmission={adminUser.canReviewSubmission}
      />
    </main>
  )
}

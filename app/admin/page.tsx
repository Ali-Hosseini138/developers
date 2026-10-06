import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logoutAction } from './actions'
import { Button } from '@/components/ui/button'
import { AdminApps } from '@/components/admin/admin-apps'

export const metadata = { title: 'مرکز بررسی — نت‌استور' }
export const dynamic = 'force-dynamic'

export type ReviewSubmission = {
  id: string
  app_id: string
  version_id: string | null
  request_type: 'app' | 'version'
  snapshot: Record<string, any>
  status: string
  rejection_reason: string | null
  submitted_at: string
  reviewed_at: string | null
}

export type Version = {
  id: string
  app_id: string
  changelog: string | null
  status: string
  apk_name: string | null
  apk_path: string | null
  apk_size: number | null
  package_name: string | null
  review_reason: string | null
  reviewed_at: string | null
  created_at: string
  submission?: ReviewSubmission
}

export type AdminApp = {
  id: string
  owner_id: string
  name: string
  tagline: string | null
  description: string | null
  category: string | null
  age_restriction: string | null
  package_name: string | null
  website: string | null
  support_email: string | null
  status: string
  developer: string
  developer_email: string | null
  created_at: string
  updated_at: string
  reviewed_at: string | null
  review_reason: string | null
  apk_name: string | null
  apk_path: string | null
  apk_size: number | null
  icon_path: string | null
  banner_path: string | null
  screenshot_paths: string[]
  has_in_app_payment: boolean
  netbox_payment_integrated: boolean
  developed_for_android_tv: boolean
  air_mouse_compatible: boolean
  versions: Version[]
  submissions: ReviewSubmission[]
}

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login')

  const supabase = createAdminClient()
  const [
    { data: apps },
    { data: versions },
    { data: profiles },
    { data: submissions },
    { count: ticketCount },
  ] = await Promise.all([
    supabase.from('apps').select('*').order('updated_at', { ascending: false }),
    supabase.from('app_versions').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('review_submissions').select('*').order('submitted_at', { ascending: false }),
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }),
  ])

  const ownerIds = [...new Set((apps || []).map((row: Record<string, any>) => row.owner_id).filter(Boolean))]
  const authUsers = new Map<string, string | null>()
  for (const ownerId of ownerIds) {
    const { data } = await supabase.auth.admin.getUserById(ownerId)
    authUsers.set(ownerId, data.user?.email || null)
  }

  const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]))
  const submissionRows = (submissions || []) as ReviewSubmission[]
  const submissionsByApp = new Map<string, ReviewSubmission[]>()
  const submissionByVersion = new Map<string, ReviewSubmission>()

  for (const submission of submissionRows) {
    const list = submissionsByApp.get(submission.app_id) || []
    list.push(submission)
    submissionsByApp.set(submission.app_id, list)
    if (submission.version_id) submissionByVersion.set(submission.version_id, submission)
  }

  const versionsByApp = new Map<string, Version[]>()
  for (const row of versions || []) {
    const v: Version = {
      id: row.id,
      app_id: row.app_id,
      changelog: row.changelog,
      status: row.status,
      apk_name: row.apk_name,
      apk_path: row.apk_path,
      apk_size: row.apk_size,
      package_name: row.package_name,
      review_reason: row.review_reason,
      reviewed_at: row.reviewed_at,
      created_at: row.created_at,
      submission: submissionByVersion.get(row.id),
    }
    const list = versionsByApp.get(row.app_id) || []
    list.push(v)
    versionsByApp.set(row.app_id, list)
  }

  const statusPriority: Record<string, number> = { pending: 0, rejected: 1, draft: 2, published: 3 }

  const adminApps: AdminApp[] = (apps || []).map((row: Record<string, any>) => ({
    id: row.id,
    owner_id: row.owner_id,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    age_restriction: row.age_restriction,
    package_name: row.package_name,
    website: row.website,
    support_email: row.support_email,
    status: row.status,
    developer: profileMap.get(row.owner_id) || 'ناشناس',
    developer_email: authUsers.get(row.owner_id) || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewed_at: row.reviewed_at,
    review_reason: row.review_reason,
    apk_name: row.apk_name,
    apk_path: row.apk_path,
    apk_size: row.apk_size,
    icon_path: row.icon_path,
    banner_path: row.banner_path,
    screenshot_paths: row.screenshot_paths || [],
    has_in_app_payment: Boolean(row.has_in_app_payment),
    netbox_payment_integrated: Boolean(row.netbox_payment_integrated),
    developed_for_android_tv: row.developed_for_android_tv !== false,
    air_mouse_compatible: Boolean(row.air_mouse_compatible),
    versions: versionsByApp.get(row.id) || [],
    submissions: submissionsByApp.get(row.id) || [],
  })).sort((a, b) => {
    const priority = (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9)
    if (priority !== 0) return priority
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })

  const pendingApps = adminApps.filter((app) => app.status === 'pending').length
  const pendingVersions = adminApps.flatMap((app) => app.versions).filter((version) => version.status === 'pending').length
  const rejected = adminApps.filter((app) => app.status === 'rejected').length
  const published = adminApps.filter((app) => app.status === 'published').length

  const stats = [
    { label: 'کل صف بررسی', value: pendingApps + pendingVersions },
    { label: 'اپ جدید / ارسال مجدد', value: pendingApps },
    { label: 'نسخه جدید', value: pendingVersions },
    { label: 'رد شده', value: rejected },
    { label: 'منتشر شده', value: published },
    { label: 'تیکت‌ها', value: ticketCount || 0 },
  ]

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">NetStore Review Center</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">مرکز بررسی و انتشار</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            صف درخواست‌ها، تغییرات هر ارسال، فایل‌ها، شرایط انتشار و سابقه تصمیم‌ها را از یکجا بررسی کنید.
          </p>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">خروج مدیر</Button>
        </form>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">{stat.value.toLocaleString('fa-IR')}</p>
          </div>
        ))}
      </section>

      <AdminApps apps={adminApps} />
    </main>
  )
}

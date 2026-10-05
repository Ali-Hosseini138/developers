import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logoutAction } from './actions'
import { Button } from '@/components/ui/button'
import { AdminApps } from '@/components/admin/admin-apps'

export const metadata = { title: 'پنل مدیریت — نت‌استور' }

export const dynamic = 'force-dynamic'

type Version = {
  id: string
  changelog: string | null
  status: string
  apk_name: string | null
  apk_path: string | null
  created_at: string
}

export type AdminApp = {
  id: string
  name: string
  tagline: string | null
  category: string | null
  status: string
  developer: string
  created_at: string
  apk_name: string | null
  apk_path: string | null
  icon_path: string | null
  banner_path: string | null
  screenshot_paths: string[]
  versions: Version[]
}

export default async function AdminPage() {
  if (!(await isAdmin())) redirect('/admin/login')

  const supabase = createAdminClient()

  const [{ data: apps }, { data: versions }, { data: profiles }, { count: ticketCount }, { count: userCount }] = await Promise.all([
    supabase.from('apps').select('*').order('created_at', { ascending: false }),
    supabase.from('app_versions').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('support_tickets').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
  ])

  const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string | null }) => [p.id, p.full_name]))
  const versionsByApp = new Map<string, Version[]>()
  for (const v of versions || []) {
    const list = versionsByApp.get(v.app_id) || []
    list.push(v as Version)
    versionsByApp.set(v.app_id, list)
  }

  const adminApps: AdminApp[] = (apps || []).map((row: Record<string, any>) => ({
    id: row.id,
    name: row.name,
    tagline: row.tagline,
    category: row.category,
    status: row.status,
    developer: profileMap.get(row.owner_id) || 'ناشناس',
    created_at: row.created_at,
    apk_name: row.apk_name,
    apk_path: row.apk_path,
    icon_path: row.icon_path,
    banner_path: row.banner_path,
    screenshot_paths: row.screenshot_paths || [],
    versions: versionsByApp.get(row.id) || [],
  }))

  const stats = [
    { label: 'اپلیکیشن‌ها', value: adminApps.length },
    { label: 'کاربران', value: userCount || 0 },
    { label: 'نسخه‌ها', value: (versions || []).length },
    { label: 'تیکت‌ها', value: ticketCount || 0 },
  ]

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">پنل مدیریت نت‌استور</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">همه اپلیکیشن‌های آپلودشده</h1>
        </div>
        <form action={logoutAction}>
          <Button type="submit" variant="outline">خروج مدیر</Button>
        </form>
      </header>

      <section className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-card-foreground">{stat.value.toLocaleString('fa-IR')}</p>
          </div>
        ))}
      </section>

      <AdminApps apps={adminApps} />
    </main>
  )
}

import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-auth'
import { AdminLoginForm } from '@/components/admin/admin-login-form'

export const metadata = { title: 'ورود مدیر — نت‌استور' }

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect('/admin')

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">پنل مدیریت</p>
          <h1 className="mt-2 text-2xl font-bold text-card-foreground text-balance">ورود مدیر نت‌استور</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">این بخش جدا از سایت است و فقط برای مدیر در دسترس است.</p>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  )
}

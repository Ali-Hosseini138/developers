import Image from 'next/image'
import type { AdminApp } from '@/app/admin/page'
import { updateAppStatusAction, updateVersionStatusAction } from '@/app/admin/actions'

const statusLabels: Record<string, string> = {
  draft: 'پیش‌نویس',
  pending: 'در انتظار بررسی',
  published: 'منتشر شده',
  rejected: 'رد شده',
  open: 'باز',
  answered: 'پاسخ داده شده',
  closed: 'بسته',
}

function adminFile(pathname: string | null) {
  return pathname ? `/api/admin/file?pathname=${encodeURIComponent(pathname)}` : null
}

function faDate(value: string) {
  return new Date(value).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function AdminApps({ apps }: { apps: AdminApp[] }) {
  if (apps.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-muted-foreground">هنوز هیچ اپلیکیشنی آپلود نشده است.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {apps.map((app) => {
        const icon = adminFile(app.icon_path)
        const apk = adminFile(app.apk_path)
        return (
          <article key={app.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start gap-4">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
                {icon ? (
                  <Image src={icon || "/placeholder.svg"} alt={`آیکون ${app.name}`} fill sizes="64px" className="object-cover" unoptimized />
                ) : (
                  <span className="flex h-full items-center justify-center text-xs text-muted-foreground">بدون آیکون</span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-card-foreground">{app.name}</h2>
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                    {statusLabels[app.status] || app.status}
                  </span>
                </div>
                {app.tagline && <p className="mt-1 text-sm text-muted-foreground">{app.tagline}</p>}
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <div className="flex gap-1"><dt className="text-muted-foreground">توسعه‌دهنده:</dt><dd className="text-card-foreground">{app.developer}</dd></div>
                  {app.category && <div className="flex gap-1"><dt className="text-muted-foreground">دسته:</dt><dd className="text-card-foreground">{app.category}</dd></div>}
                  <div className="flex gap-1"><dt className="text-muted-foreground">تاریخ:</dt><dd className="text-card-foreground">{faDate(app.created_at)}</dd></div>
                  <div className="flex gap-1"><dt className="text-muted-foreground">نسخه‌ها:</dt><dd className="text-card-foreground">{app.versions.length.toLocaleString('fa-IR')}</dd></div>
                </dl>
              </div>

              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {apk && (
                  <a
                    href={apk}
                    className="rounded-lg border border-input px-3 py-2 text-sm font-medium text-card-foreground transition-colors hover:bg-secondary"
                  >
                    دانلود {app.apk_name || 'APK'}
                  </a>
                )}
                {app.status !== 'published' && (
                  <form action={updateAppStatusAction}>
                    <input type="hidden" name="appId" value={app.id} />
                    <input type="hidden" name="status" value="published" />
                    <button className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                      تأیید و انتشار
                    </button>
                  </form>
                )}
                {app.status !== 'rejected' && (
                  <form action={updateAppStatusAction}>
                    <input type="hidden" name="appId" value={app.id} />
                    <input type="hidden" name="status" value="rejected" />
                    <button className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-medium text-destructive">
                      رد
                    </button>
                  </form>
                )}
              </div>
            </div>

            {app.versions.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">نسخه‌های ثبت‌شده</p>
                <ul className="flex flex-col gap-2">
                  {app.versions.map((version) => {
                    const versionApk = adminFile(version.apk_path)
                    return (
                      <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <span className="text-card-foreground">{version.apk_name || 'فایل APK'}</span>
                          {version.changelog && <span className="text-muted-foreground"> — {version.changelog}</span>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{statusLabels[version.status] || version.status}</span>
                          {versionApk && <a href={versionApk} className="text-xs font-medium text-primary underline-offset-4 hover:underline">دانلود</a>}
                          {version.status !== 'published' && (
                            <form action={updateVersionStatusAction}>
                              <input type="hidden" name="versionId" value={version.id} />
                              <input type="hidden" name="status" value="published" />
                              <button className="text-xs font-medium text-primary underline-offset-4 hover:underline">تأیید نسخه</button>
                            </form>
                          )}
                          {version.status !== 'rejected' && (
                            <form action={updateVersionStatusAction}>
                              <input type="hidden" name="versionId" value={version.id} />
                              <input type="hidden" name="status" value="rejected" />
                              <button className="text-xs font-medium text-destructive underline-offset-4 hover:underline">رد نسخه</button>
                            </form>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Check, FileArchive, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/components/store-provider'
import { FileDropzone } from '@/components/upload/file-dropzone'
import { developerHubErrorMessage, postDeveloperHubMultipart } from '@/lib/developer-hub-client'
import { toFa } from '@/lib/format'

const MAX_APK_SIZE = 300 * 1024 * 1024

export default function NewVersionPage() {
  const { id } = useParams<{ id: string }>()
  const { user, authReady, getApp, reloadDeveloperApps } = useStore()
  const router = useRouter()
  const app = getApp(id)

  const [changes, setChanges] = useState('')
  const [apkFile, setApkFile] = useState<File | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (authReady && !user) router.replace('/login?next=/dashboard')
  }, [authReady, user, router])

  if (!authReady) return <main className="mx-auto flex min-h-[40vh] max-w-2xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری اپ...</span></main>
  if (!user) return null
  if (!app) return <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">این اپ پیدا نشد یا به حساب شما تعلق ندارد.</div></main>
  if (!app.canSubmit) return <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">در حال حاضر امکان ارسال APK جدید برای این اپ وجود ندارد؛ یک درخواست فعال در جریان است.</div></main>

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!apkFile || saving) return

    setSaving(true)
    setUploadProgress(0)
    setErrorMessage('')

    const formData = new FormData()
    formData.append('apkFile', apkFile)
    if (changes.trim()) formData.append('changeLog', changes.trim())

    try {
      await postDeveloperHubMultipart(
        `/api/v1/developer-hub/apps/${encodeURIComponent(app.id)}/submissions/`,
        formData,
        (percentage) => setUploadProgress(Math.round(percentage)),
      )
      setUploadProgress(100)
      setSaved(true)
      await reloadDeveloperApps()
      window.setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 650)
    } catch (error) {
      setErrorMessage(developerHubErrorMessage(error, 'ثبت نسخه انجام نشد. فایل را بررسی کنید و دوباره تلاش کنید.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به داشبورد
      </Link>

      <div className="mt-8">
        <p className="text-sm font-semibold text-primary">{app.isPublished ? 'انتشار نسخه جدید' : 'ارسال مجدد APK'}</p>
        <h1 className="mt-2 text-3xl font-bold">{app.name}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          فایل مستقیم برای بک‌اند Developer Hub ارسال می‌شود و ابتدا وارد مرحله پردازش APK خواهد شد.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <FileDropzone
            accept=".apk,application/vnd.android.package-archive"
            label={app.isPublished ? 'فایل APK نسخه جدید' : 'فایل APK جدید'}
            hint="حداکثر حجم قابل قبول در این پنل ۳۰۰ مگابایت است."
            onFiles={(files) => {
              const file = files[0]
              if (!file) return
              if (!file.name.toLowerCase().endsWith('.apk')) {
                setApkFile(null)
                setErrorMessage('فایل انتخاب‌شده باید با پسوند APK باشد.')
                return
              }
              if (file.size > MAX_APK_SIZE) {
                setApkFile(null)
                setErrorMessage('حجم فایل APK نباید بیشتر از ۳۰۰ مگابایت باشد.')
                return
              }
              setErrorMessage('')
              setApkFile(file)
            }}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {apkFile ? `${apkFile.name} — ${(apkFile.size / 1024 / 1024).toFixed(1)} MB` : 'فایل هنگام ثبت درخواست مستقیماً برای بک‌اند ارسال می‌شود.'}
          </p>
        </div>

        <div>
          <Label>Package Name ثبت‌شده</Label>
          <Input value={app.packageName || '—'} readOnly dir="ltr" className="mt-1.5 bg-secondary/50" />
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            بک‌اند Package Name داخل APK را استخراج می‌کند و با این مقدار تطبیق می‌دهد.
          </p>
        </div>

        <div>
          <Label htmlFor="changes">تغییرات نسخه — اختیاری</Label>
          <Textarea
            id="changes"
            value={changes}
            onChange={(event) => setChanges(event.target.value)}
            placeholder="ویژگی‌های جدید، رفع مشکلات و تغییرات این نسخه را بنویسید..."
            className="mt-1.5 min-h-40"
            maxLength={5000}
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-sm leading-7 text-muted-foreground">
          <FileArchive className="mt-1 size-4 shrink-0 text-primary" />
          پس از ارسال، وضعیت پردازش و بررسی از خود بک‌اند دریافت می‌شود. برای نسخه‌های منتشرشده، امضا و versionCode نیز سمت سرور کنترل می‌شوند.
        </div>

        {saving && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {uploadProgress >= 100 ? <Check className="size-4 text-primary" /> : <Loader2 className="size-4 animate-spin text-primary" />}
                {uploadProgress >= 100 ? 'فایل APK آپلود شد؛ در حال ثبت درخواست...' : 'در حال آپلود فایل APK...'}
              </span>
              <span className="font-bold text-primary" dir="ltr">{toFa(uploadProgress)}٪</span>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="پیشرفت آپلود APK" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadProgress}>
              <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">تا پایان آپلود این صفحه را نبندید.</p>
          </div>
        )}

        {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}

        <Button type="submit" disabled={saving || saved || !apkFile} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <UploadCloud className="size-4" />}
          {saving ? 'در حال ثبت...' : saved ? 'درخواست ثبت شد' : app.isPublished ? 'ارسال نسخه برای بررسی' : 'ارسال APK جدید'}
        </Button>
      </form>
    </main>
  )
}

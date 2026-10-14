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
import { uploadPrivateFile } from '@/lib/blob-upload-client'
import { FileDropzone } from '@/components/upload/file-dropzone'
import { toFa } from '@/lib/format'

export default function NewVersionPage() {
  const { id } = useParams<{ id: string }>()
  const { user, authReady, getApp, addVersion } = useStore()
  const router = useRouter()
  const app = getApp(id)
  const [changes, setChanges] = useState('')
  const [apkFile, setApkFile] = useState<File | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [apkUploadComplete, setApkUploadComplete] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (authReady && !user) router.replace('/login?next=/dashboard')
  }, [authReady, user, router])

  if (!authReady) return <main className="mx-auto flex min-h-[40vh] max-w-2xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری اپ...</span></main>
  if (!user) return null
  if (!app) return <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">این اپ پیدا نشد یا به حساب شما تعلق ندارد.</div></main>
  if (app.status !== 'published') return <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">نسخه جدید فقط برای اپلیکیشن منتشرشده قابل ارسال است.</div></main>

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!apkFile || !changes.trim() || saving) return

    setSaving(true)
    setUploadProgress(0)
    setApkUploadComplete(false)
    setErrorMessage('')

    try {
      const uploadedApk = await uploadPrivateFile(user.id!, apkFile, (percentage) => setUploadProgress(Math.round(percentage)))
      setUploadProgress(100)
      setApkUploadComplete(true)
      await addVersion(
        app.id,
        { pathname: uploadedApk.pathname, name: uploadedApk.name, size: uploadedApk.size },
        app.packageName,
        changes.trim(),
      )
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 700)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'submit_failed'
      setErrorMessage(
        code === 'apk_too_large'
          ? 'حجم فایل APK نباید بیشتر از ۲۵۰ مگابایت باشد.'
          : code === 'version_under_review'
            ? 'یک نسخه از این اپ در حال بررسی است. بعد از تعیین وضعیت آن می‌توانید نسخه جدید دیگری ارسال کنید.'
          : code === 'package_name_mismatch'
            ? 'Package Name این APK با اپلیکیشن منتشرشده یکسان نیست.'
          : code === 'auth_required'
            ? 'نشست ورود شما منقضی شده است. دوباره وارد شوید.'
            : 'ثبت نسخه انجام نشد. فایل را بررسی کنید و دوباره تلاش کنید.',
      )
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
        <p className="text-sm font-semibold text-primary">انتشار نسخه جدید</p>
        <h1 className="mt-2 text-3xl font-bold">نسخه جدید {app.name}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          فایل APK این نسخه ذخیره می‌شود و سپس برای بررسی تیم نت‌استور در وضعیت «در انتظار بررسی» قرار می‌گیرد.
        </p>
      </div>

      <form onSubmit={submit} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <div>
          <FileDropzone
            accept=".apk,application/vnd.android.package-archive"
            label="فایل APK نسخه جدید"
            hint="فایل APK را اینجا بکشید و رها کنید یا برای انتخاب کلیک کنید — حداکثر حجم ۲۵۰ مگابایت"
            onFiles={(files) => {
              const file = files[0]
              if (!file) return
              if (!file.name.toLowerCase().endsWith('.apk')) {
                setApkFile(null)
                setErrorMessage('فایل انتخاب‌شده باید با فرمت APK باشد.')
                return
              }
              if (file.size > 250 * 1024 * 1024) {
                setApkFile(null)
                setErrorMessage('حجم فایل APK نباید بیشتر از ۲۵۰ مگابایت باشد.')
                return
              }
              setErrorMessage('')
              setApkFile(file)
            }}
          />
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {apkFile ? `${apkFile.name} — ${(apkFile.size / 1024 / 1024).toFixed(1)} MB` : 'حداکثر حجم فایل ۲۵۰ مگابایت است.'}
          </p>
        </div>

        <div>
          <Label>Package Name فعلی اپ</Label>
          <Input
            value={app.packageName || 'هنوز از APK استخراج نشده'}
            readOnly
            dir="ltr"
            className="mt-1.5 bg-secondary/50"
          />
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            فعلاً Package Name از نام فایل حدس زده نمی‌شود؛ چون حدس‌زدن می‌تواند مقدار اشتباه تولید کند. استخراج واقعی از APK را در مرحله بعد اضافه می‌کنیم.
          </p>
        </div>

        <div>
          <Label htmlFor="changes">تغییرات نسخه</Label>
          <Textarea
            id="changes"
            value={changes}
            onChange={(e) => setChanges(e.target.value)}
            placeholder="ویژگی‌های جدید، رفع مشکلات و تغییرات این نسخه را بنویسید..."
            className="mt-1.5 min-h-40"
            required
          />
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-sm leading-7 text-muted-foreground">
          <FileArchive className="mt-1 size-4 shrink-0 text-primary" />
          بعد از ارسال، خود فایل APK نگهداری می‌شود و نسخه برای بررسی تیم نت‌استور ثبت خواهد شد.
        </div>

        {saving && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {apkUploadComplete ? <Check className="size-4 text-primary" /> : <Loader2 className="size-4 animate-spin text-primary" />}
                {apkUploadComplete ? 'فایل APK با موفقیت آپلود شد' : 'در حال آپلود فایل APK...'}
              </span>
              <span className="font-bold text-primary" dir="ltr">{toFa(uploadProgress)}٪</span>
            </div>
            <div
              className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-label="پیشرفت آپلود نسخه جدید APK"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={uploadProgress}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">تا پایان آپلود این صفحه را نبندید.</p>
          </div>
        )}

        {errorMessage && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={saving || saved || !apkFile || !changes.trim()} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : <UploadCloud className="size-4" />}
          {saving ? 'در حال ثبت...' : saved ? 'نسخه ثبت شد' : 'ارسال نسخه برای بررسی'}
        </Button>
      </form>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Save, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/components/store-provider'
import { uploadPrivateFile } from '@/lib/blob-upload-client'
import { CATEGORIES } from '@/lib/types'

const ageOptions = ['همه سنین', '+۷', '+۱۲', '+۱۵', '+۱۸'] as const

export default function EditAppPage() {
  const { id } = useParams<{ id: string }>()
  const { user, authReady, getApp, updateApp, submitAppForReview } = useStore()
  const router = useRouter()
  const app = getApp(id)

  const [name, setName] = useState(app?.name || '')
  const [tagline, setTagline] = useState(app?.tagline || '')
  const [description, setDescription] = useState(app?.description || '')
  const [category, setCategory] = useState(app?.category || '')
  const [ageRestriction, setAgeRestriction] = useState(app?.ageRestriction || 'همه سنین')
  const [packageName, setPackageName] = useState(app?.packageName || '')
  const [website, setWebsite] = useState(app?.website || '')
  const [supportEmail, setSupportEmail] = useState(app?.supportEmail || '')
  const [icon, setIcon] = useState(app?.icon || '')
  const [banner, setBanner] = useState(app?.banner || '')
  const [screenshots, setScreenshots] = useState(app?.screenshots || [])

  const [iconFile, setIconFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [newScreenshotFiles, setNewScreenshotFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (authReady && !user) router.replace('/login?next=/dashboard')
  }, [authReady, user, router])

  if (!authReady) return <main className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری اپ...</span></main>
  if (!user) return null
  if (!app) return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">این اپ پیدا نشد یا به حساب شما تعلق ندارد.</div></main>

  const canEditPackageName = !app.status || app.status === 'draft' || app.status === 'rejected'
  const packageNamePattern = /^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/

  const readImage = (file: File, setter: (value: string) => void) => {
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    setErrorMessage('')

    if (canEditPackageName && !packageNamePattern.test(packageName.trim())) {
      setErrorMessage('پکیج‌نیم معتبر نیست. نمونه صحیح: com.company.app')
      return
    }

    setSaving(true)

    try {
      const [iconUpload, bannerUpload, ...newScreenshots] = await Promise.all([
        ...(iconFile ? [uploadPrivateFile(user.id!, iconFile)] : [Promise.resolve(null)]),
        ...(bannerFile ? [uploadPrivateFile(user.id!, bannerFile)] : [Promise.resolve(null)]),
        ...newScreenshotFiles.map((file) => uploadPrivateFile(user.id!, file)),
      ])

      await updateApp(app.id, {
        name,
        tagline,
        description,
        category: category as typeof app.category,
        ageRestriction: ageRestriction as typeof app.ageRestriction,
        packageName: packageName.trim(),
        website,
        supportEmail,
        icon,
        banner,
        screenshots,
        iconPath: iconUpload?.pathname ?? app.iconPath,
        bannerPath: bannerUpload?.pathname ?? app.bannerPath,
        screenshotPaths: [...(app.screenshotPaths || []), ...newScreenshots.filter(Boolean).map((item) => item!.pathname)],
        updatedAt: 'امروز',
      })

      if (app.status === 'rejected') {
        await submitAppForReview(app.id)
      }
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 700)
    } catch (error) {
      const code = error instanceof Error ? error.message : 'save_failed'
      setErrorMessage(
        code === 'image_too_large'
          ? 'حجم هر تصویر باید حداکثر ۸ مگابایت باشد.'
          : code === 'unsupported_image_type'
            ? 'فرمت تصویر پشتیبانی نمی‌شود. PNG، JPG یا WEBP انتخاب کنید.'
            : code === 'auth_required'
              ? 'نشست ورود شما منقضی شده است. دوباره وارد شوید.'
              : 'ذخیره تغییرات انجام نشد. فایل‌ها یا اطلاعات را بررسی کنید و دوباره تلاش کنید.',
      )
    } finally {
      setSaving(false)
    }
  }

  const mediaInput = (
    label: string,
    value: string,
    setPreview: (value: string) => void,
    setFile: (file: File) => void,
    ratio: string,
  ) => (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">ویرایش</span>
      </div>
      {value && (
        <img
          src={value}
          alt={label}
          className={`mt-3 w-full rounded-lg object-cover ${ratio === '1:1' ? 'aspect-square max-w-40' : 'aspect-video'}`}
        />
      )}
      <Label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm hover:border-primary/50">
        <UploadCloud className="size-4" />
        انتخاب فایل جدید
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setFile(file)
            readImage(file, setPreview)
          }}
        />
      </Label>
    </div>
  )

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به داشبورد
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold text-primary">ویرایش اطلاعات اپ</p>
        <h1 className="mt-2 text-3xl font-bold">ویرایش {app.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">اطلاعات فروشگاه و رسانه‌های اپ را ویرایش کنید.</p>
      </div>

      <form onSubmit={save} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <Field label="عنوان اپ"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="معرفی کوتاه"><Input value={tagline} onChange={(e) => setTagline(e.target.value)} required /></Field>
        <Field label="توضیحات کامل"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-40" required /></Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="دسته‌بندی">
            <Select value={category} onValueChange={(value) => value && setCategory(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="پکیج‌نیم">
            <Input
              value={packageName}
              onChange={(e) => setPackageName(e.target.value.trim())}
              readOnly={!canEditPackageName}
              dir="ltr"
              placeholder="com.company.app"
              className={!canEditPackageName ? 'bg-secondary/50' : ''}
              required
            />
            <p className="text-xs leading-6 text-muted-foreground">
              {canEditPackageName
                ? 'تا قبل از انتشار می‌توانید پکیج‌نیم را اصلاح کنید. این مقدار باید دقیقاً با شناسه داخل APK یکی باشد.'
                : 'بعد از انتشار، پکیج‌نیم قابل تغییر نیست؛ چون شناسه اصلی اپ در Android است.'}
            </p>
          </Field>
          <Field label="محدودیت سنی">
            <Select value={ageRestriction} onValueChange={(value) => value && setAgeRestriction(value as typeof ageRestriction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ageOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="آدرس وبسایت"><Input value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" type="url" /></Field>
          <Field label="ایمیل پشتیبانی"><Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} dir="ltr" type="email" /></Field>
        </div>

        <div className="rounded-xl bg-secondary/60 p-4 text-sm leading-7 text-muted-foreground">
          فایل APK از صفحه ویرایش تغییر نمی‌کند. برای انتشار APK جدید از بخش «نسخه جدید» استفاده کنید تا تاریخچه نسخه‌ها حفظ شود.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {mediaInput('آیکون برنامه (۱:۱)', icon, setIcon, setIconFile, '1:1')}
          {mediaInput('بنر معرفی (۱۶:۹)', banner, setBanner, setBannerFile, '16:9')}
        </div>

        <Field label="تصاویر محیط برنامه">
          <Label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-4 text-sm">
            <UploadCloud className="size-4" />
            افزودن تصویر جدید
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = Array.from(e.target.files || [])
                setNewScreenshotFiles((old) => [...old, ...files].slice(0, 6))
                files.forEach((file) => readImage(file, (url) => setScreenshots((old) => [...old, url].slice(0, 6))))
              }}
            />
          </Label>
          <div className="mt-3 flex flex-wrap gap-3">
            {screenshots.map((src, index) => (
              <img key={`${src}-${index}`} src={src} alt={`تصویر محیط ${index + 1}`} className="size-20 rounded-lg object-cover" />
            ))}
          </div>
        </Field>

        {errorMessage && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button type="submit" disabled={saving || saved} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'در حال ذخیره...' : saved ? (app.status === 'rejected' ? 'اصلاحات ارسال شد' : 'ذخیره شد') : (app.status === 'rejected' ? 'ذخیره و ارسال مجدد' : 'ذخیره تغییرات')}
        </Button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label>{label}</Label>{children}</div>
}

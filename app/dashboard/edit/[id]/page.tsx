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
import { CATEGORIES } from '@/lib/types'

const ageOptions = ['همه سنین', '+۷', '+۱۲', '+۱۵', '+۱۸'] as const

type UploadedFile = {
  pathname: string
  name: string
  size: number
  contentType: string
}

export default function EditAppPage() {
  const { id } = useParams<{ id: string }>()
  const { user, getApp, updateApp } = useStore()
  const router = useRouter()
  const app = getApp(id)

  const [name, setName] = useState(app?.name || '')
  const [tagline, setTagline] = useState(app?.tagline || '')
  const [description, setDescription] = useState(app?.description || '')
  const [category, setCategory] = useState(app?.category || '')
  const [ageRestriction, setAgeRestriction] = useState(app?.ageRestriction || 'همه سنین')
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
    if (!user) router.replace('/login?next=/dashboard')
  }, [user, router])

  if (!user || !app) return null

  const readImage = (file: File, setter: (value: string) => void) => {
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function uploadFile(file: File) {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/blob-upload', { method: 'POST', body })
    if (!response.ok) throw new Error('upload_failed')
    return response.json() as Promise<UploadedFile>
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return

    setSaving(true)
    setErrorMessage('')

    try {
      const [iconUpload, bannerUpload, ...newScreenshots] = await Promise.all([
        ...(iconFile ? [uploadFile(iconFile)] : [Promise.resolve(null)]),
        ...(bannerFile ? [uploadFile(bannerFile)] : [Promise.resolve(null)]),
        ...newScreenshotFiles.map(uploadFile),
      ])

      await updateApp(app.id, {
        name,
        tagline,
        description,
        category: category as typeof app.category,
        ageRestriction: ageRestriction as typeof app.ageRestriction,
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

      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 700)
    } catch {
      setErrorMessage('ذخیره تغییرات انجام نشد. فایل‌ها یا اطلاعات را بررسی کنید و دوباره تلاش کنید.')
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
            <Input value={app.packageName || 'ثبت نشده'} readOnly dir="ltr" className="bg-secondary/50" />
          </Field>
          <Field label="محدودیت سنی">
            <Select value={ageRestriction} onValueChange={(value) => value && setAgeRestriction(value as typeof ageRestriction)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ageOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="آدرس وبسایت"><Input value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" /></Field>
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
          {saving ? 'در حال ذخیره...' : saved ? 'ذخیره شد' : 'ذخیره تغییرات'}
        </Button>
      </form>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label>{label}</Label>{children}</div>
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/components/store-provider'
import { FileDropzone } from '@/components/upload/file-dropzone'
import { developerHubErrorMessage, patchDeveloperHubMultipart } from '@/lib/developer-hub-client'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_ICON_SIZE = 2 * 1024 * 1024
const MAX_SCREENSHOTS = 10

type CategoryOption = { id: number; name: string }
type ImageKind = 'icon' | 'banner' | 'background' | 'screenshot'

export default function EditAppPage() {
  const { id } = useParams<{ id: string }>()
  const { user, authReady, getApp, reloadDeveloperApps } = useStore()
  const router = useRouter()
  const app = getApp(id)

  const [name, setName] = useState(app?.name || '')
  const [nameEn, setNameEn] = useState(app?.nameEn || '')
  const [tagline, setTagline] = useState(app?.tagline || '')
  const [description, setDescription] = useState(app?.description || '')
  const [packageName, setPackageName] = useState(app?.packageName || '')
  const [categoryId, setCategoryId] = useState(app?.categoryId ? String(app.categoryId) : '')
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [applicationType, setApplicationType] = useState<'1' | '2'>(app?.applicationType === 2 ? '2' : '1')
  const [ageLimit, setAgeLimit] = useState(String(app?.ageLimit ?? 0))
  const [supportsNetboxPayment, setSupportsNetboxPayment] = useState(Boolean(app?.supportsNetboxPayment))

  const [iconFile, setIconFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [replacementScreenshots, setReplacementScreenshots] = useState<File[]>([])

  const [iconPreview, setIconPreview] = useState(app?.icon || '')
  const [bannerPreview, setBannerPreview] = useState(app?.banner || '')
  const [backgroundPreview, setBackgroundPreview] = useState(app?.backgroundImage || '')
  const [replacementPreviews, setReplacementPreviews] = useState<string[]>([])

  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (authReady && !user) router.replace('/login?next=/dashboard')
  }, [authReady, user, router])

  useEffect(() => {
    fetch('/api/developer-hub/config', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const rows = Array.isArray(payload?.categories) ? payload.categories : []
        setCategories(rows)
      })
      .catch(() => setCategories([]))
  }, [])

  if (!authReady) {
    return <main className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری اپ...</span></main>
  }
  if (!user) return null
  if (!app) {
    return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">این اپ پیدا نشد یا به حساب شما تعلق ندارد.</div></main>
  }
  if (!app.canEdit) {
    return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">در حال حاضر ویرایش اطلاعات این اپ مجاز نیست. وضعیت و دسترسی ویرایش مستقیماً توسط بک‌اند تعیین می‌شود.</div></main>
  }

  async function imageDimensions(file: File) {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(file)
      const result = { width: bitmap.width, height: bitmap.height }
      bitmap.close()
      return result
    }

    return new Promise<{ width: number; height: number }>((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const image = new Image()
      image.onload = () => {
        const result = { width: image.naturalWidth, height: image.naturalHeight }
        URL.revokeObjectURL(url)
        resolve(result)
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('invalid_image'))
      }
      image.src = url
    })
  }

  async function validateImage(file: File, kind: ImageKind) {
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setErrorMessage('فرمت تصویر باید PNG یا JPEG باشد.')
      return false
    }

    const maxSize = kind === 'icon' ? MAX_ICON_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      setErrorMessage(kind === 'icon' ? 'حجم آیکون باید حداکثر ۲ مگابایت باشد.' : 'حجم هر تصویر باید حداکثر ۵ مگابایت باشد.')
      return false
    }

    try {
      const { width, height } = await imageDimensions(file)
      if (kind === 'icon' && (width !== height || width < 128 || height < 128)) {
        setErrorMessage('آیکون باید مربع و حداقل ۱۲۸×۱۲۸ پیکسل باشد.')
        return false
      }
      if ((kind === 'banner' || kind === 'screenshot') && width / height < 1.5) {
        setErrorMessage('بنر و اسکرین‌شات باید افقی باشند؛ نسبت عرض به ارتفاع حداقل ۱.۵ است.')
        return false
      }
    } catch {
      setErrorMessage('فایل تصویر معتبر نیست.')
      return false
    }

    setErrorMessage('')
    return true
  }

  function preview(file: File, setter: (value: string) => void) {
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result))
    reader.readAsDataURL(file)
  }

  async function chooseSingle(file: File, kind: Exclude<ImageKind, 'screenshot'>) {
    if (!(await validateImage(file, kind))) return

    if (kind === 'icon') {
      setIconFile(file)
      preview(file, setIconPreview)
    } else if (kind === 'banner') {
      setBannerFile(file)
      preview(file, setBannerPreview)
    } else {
      setBackgroundFile(file)
      preview(file, setBackgroundPreview)
    }
  }

  async function chooseScreenshots(files: File[]) {
    const candidates = files.slice(0, MAX_SCREENSHOTS)
    if (files.length > MAX_SCREENSHOTS) {
      setErrorMessage('حداکثر ۱۰ اسکرین‌شات قابل ثبت است.')
      return
    }

    const seen = new Set<string>()
    const unique = candidates.filter((file) => {
      const key = file.name + ':' + file.size + ':' + file.lastModified
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    for (const file of unique) {
      if (!(await validateImage(file, 'screenshot'))) return
    }

    const previews = await Promise.all(unique.map((file) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new Error('image_read_failed'))
      reader.readAsDataURL(file)
    })))

    setReplacementScreenshots(unique)
    setReplacementPreviews(previews)
    setErrorMessage('')
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (saving) return

    if (!name.trim() || !tagline.trim() || !description.trim()) {
      setErrorMessage('عنوان، توضیح کوتاه و توضیحات کامل فارسی الزامی هستند.')
      return
    }
    if (!/^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(packageName.trim())) {
      setErrorMessage('Package Name معتبر نیست. نمونه صحیح: com.company.app')
      return
    }
    if (!/^\d+$/.test(categoryId) || Number(categoryId) <= 0) {
      setErrorMessage('Category ID معتبر وارد کنید.')
      return
    }
    if (!/^\d+$/.test(ageLimit) || Number(ageLimit) < 0 || Number(ageLimit) > 99) {
      setErrorMessage('محدودیت سنی باید عددی بین ۰ تا ۹۹ باشد.')
      return
    }

    setSaving(true)
    setSaved(false)
    setUploadProgress(0)
    setErrorMessage('')

    const formData = new FormData()
    formData.append('packageName', packageName.trim())
    formData.append('name', name.trim())
    formData.append('nameEn', nameEn.trim())
    formData.append('shortDescription', tagline.trim())
    formData.append('longDescription', description.trim())
    formData.append('categoryId', categoryId)
    formData.append('applicationType', applicationType)
    formData.append('ageLimit', ageLimit)
    formData.append('supportsNetboxPayment', supportsNetboxPayment ? 'true' : 'false')
    if (iconFile) formData.append('icon', iconFile)
    if (bannerFile) formData.append('banner', bannerFile)
    if (backgroundFile) formData.append('backgroundImage', backgroundFile)
    replacementScreenshots.forEach((file) => formData.append('screenshots', file))

    try {
      await patchDeveloperHubMultipart(
        '/api/v1/developer-hub/apps/' + encodeURIComponent(app.id) + '/',
        formData,
        (percent) => setUploadProgress(Math.round(percent)),
      )
      setUploadProgress(100)
      setSaved(true)
      await reloadDeveloperApps()
      window.setTimeout(() => {
        router.push('/dashboard')
        router.refresh()
      }, 500)
    } catch (error) {
      setErrorMessage(developerHubErrorMessage(error, 'ذخیره تغییرات انجام نشد. دوباره تلاش کنید.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به داشبورد
      </Link>

      <div className="mt-6">
        <p className="text-sm font-semibold text-primary">ویرایش اطلاعات اپ</p>
        <h1 className="mt-2 text-3xl font-bold">ویرایش {app.name}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">این صفحه فقط فیلدهایی را ویرایش می‌کند که API رسمی Developer Hub پشتیبانی می‌کند.</p>
      </div>

      <form onSubmit={save} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <Field label="عنوان اپلیکیشن (فارسی)" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} />
        </Field>
        <Field label="عنوان اپلیکیشن (English) — اختیاری">
          <Input value={nameEn} onChange={(event) => setNameEn(event.target.value)} maxLength={255} dir="ltr" />
        </Field>
        <Field label="توضیح کوتاه (فارسی)" required>
          <Textarea value={tagline} onChange={(event) => setTagline(event.target.value)} maxLength={1000} rows={3} />
        </Field>
        <Field label="توضیحات کامل (فارسی)" required>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} rows={7} />
        </Field>

        <Field label="Package Name" required>
          <Input value={packageName} onChange={(event) => setPackageName(event.target.value.trim())} maxLength={100} dir="ltr" />
          <p className="text-xs leading-6 text-muted-foreground">قبل از انتشار قابل تغییر است و باید با Package Name داخل APK یکسان باشد.</p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="دسته‌بندی" required>
            {categories.length > 0 ? (
              <Select value={categoryId} onValueChange={(value) => value && setCategoryId(value)}>
                <SelectTrigger><SelectValue placeholder="انتخاب دسته‌بندی" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <>
                <Input value={categoryId} onChange={(event) => setCategoryId(event.target.value.replace(/\D/g, ''))} inputMode="numeric" dir="ltr" placeholder="Category ID" />
                <p className="text-xs leading-6 text-amber-700">API ارسالی endpoint فهرست دسته‌بندی ندارد؛ فعلاً شناسه دسته‌بندی استفاده می‌شود.</p>
              </>
            )}
          </Field>

          <Field label="نوع اپلیکیشن">
            <Select value={applicationType} onValueChange={(value) => value && setApplicationType(value as '1' | '2')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">برنامه</SelectItem>
                <SelectItem value="2">بازی</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="محدودیت سنی">
            <Input value={ageLimit} onChange={(event) => setAgeLimit(event.target.value.replace(/\D/g, '').slice(0, 2))} inputMode="numeric" dir="ltr" placeholder="0 تا 99" />
          </Field>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm leading-7">
          <input type="checkbox" checked={supportsNetboxPayment} onChange={(event) => setSupportsNetboxPayment(event.target.checked)} className="mt-1 size-4" />
          <span>این اپ از Netbox Payment پشتیبانی می‌کند.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <MediaField
            title="آیکون"
            value={iconPreview}
            square
            hint="PNG یا JPEG — حداکثر ۲MB — مربع و حداقل ۱۲۸×۱۲۸"
            onFile={(file) => void chooseSingle(file, 'icon')}
            onClear={() => { setIconFile(null); setIconPreview(app.icon || '') }}
          />
          <MediaField
            title="بنر"
            value={bannerPreview}
            hint="PNG یا JPEG — حداکثر ۵MB — افقی با نسبت حداقل ۱.۵"
            onFile={(file) => void chooseSingle(file, 'banner')}
            onClear={() => { setBannerFile(null); setBannerPreview(app.banner || '') }}
          />
          <MediaField
            title="تصویر پس‌زمینه"
            value={backgroundPreview}
            hint="PNG یا JPEG — حداکثر ۵MB"
            onFile={(file) => void chooseSingle(file, 'background')}
            onClear={() => { setBackgroundFile(null); setBackgroundPreview(app.backgroundImage || '') }}
          />
        </div>

        <Field label="اسکرین‌شات‌ها">
          <p className="text-xs leading-6 text-muted-foreground">
            اگر فایل جدید انتخاب کنید، کل مجموعه اسکرین‌شات‌های قبلی با مجموعه جدید جایگزین می‌شود. حداکثر ۱۰ تصویر، هرکدام حداکثر ۵MB و افقی.
          </p>
          <div className="mt-2">
            <FileDropzone
              accept="image/png,image/jpeg"
              label="انتخاب مجموعه جدید اسکرین‌شات‌ها"
              hint="PNG یا JPEG — حداکثر ۱۰ فایل"
              multiple
              onFiles={(files) => void chooseScreenshots(files)}
            />
          </div>

          {replacementPreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {replacementPreviews.map((src, index) => (
                <div key={src.slice(0, 48) + '-' + index} className="relative">
                  <img src={src} alt={'اسکرین‌شات جدید ' + (index + 1)} className="aspect-video w-full rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    aria-label={'حذف اسکرین‌شات ' + (index + 1)}
                    onClick={() => {
                      setReplacementPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index))
                      setReplacementScreenshots((current) => current.filter((_, itemIndex) => itemIndex !== index))
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : app.screenshots.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {app.screenshots.map((src, index) => (
                <img key={src + '-' + index} src={src} alt={'اسکرین‌شات فعلی ' + (index + 1)} className="aspect-video w-full rounded-lg border border-border object-cover" />
              ))}
            </div>
          ) : null}
        </Field>

        {saving && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="flex items-center justify-between text-sm">
              <span>در حال ارسال تغییرات...</span>
              <span dir="ltr">{uploadProgress.toLocaleString('fa-IR')}٪</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-[width]" style={{ width: uploadProgress + '%' }} />
            </div>
          </div>
        )}

        {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm leading-7 text-destructive">{errorMessage}</p>}

        <Button type="submit" disabled={saving || saved} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'در حال ذخیره...' : saved ? 'ذخیره شد' : 'ذخیره تغییرات'}
        </Button>
      </form>
    </main>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label>{label} {required && <span className="text-destructive">*</span>}</Label>{children}</div>
}

function MediaField({
  title,
  value,
  square,
  hint,
  onFile,
  onClear,
}: {
  title: string
  value: string
  square?: boolean
  hint: string
  onFile: (file: File) => void
  onClear: () => void
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <Label>{title}</Label>
      {value && <img src={value} alt={title} className={'mt-3 w-full rounded-lg border border-border object-cover ' + (square ? 'aspect-square max-w-40' : 'aspect-video')} />}
      <div className="mt-3">
        <FileDropzone
          accept="image/png,image/jpeg"
          label="انتخاب فایل جدید"
          hint={hint}
          compact
          onFiles={(files) => files[0] && onFile(files[0])}
        />
      </div>
      {value && <button type="button" onClick={onClear} className="mt-2 text-xs text-muted-foreground hover:text-foreground">لغو انتخاب فایل جدید</button>}
    </div>
  )
}

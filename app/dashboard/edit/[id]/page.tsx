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
import { changedDeveloperMetadata, unconfirmedDeveloperMetadata } from '@/lib/developer-hub-patch'
import { mapDeveloperHubApp } from '@/lib/developer-hub-model'
import type { StoreApp } from '@/lib/types'
import { useStore } from '@/components/store-provider'
import { PaymentCommitmentSummary } from '@/components/payment-commitment-summary'
import { FileDropzone } from '@/components/upload/file-dropzone'
import { DeveloperCategorySelect } from '@/components/upload/developer-category-select'
import { developerHubFieldErrors, developerHubErrorMessage, patchDeveloperHubMultipart } from '@/lib/developer-hub-client'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_ICON_SIZE = 5 * 1024 * 1024
const MAX_SCREENSHOTS = 20

type ImageKind = 'icon' | 'banner' | 'background' | 'screenshot'

export default function EditAppPage() {
  const { id } = useParams<{ id: string }>()
  const { user, authReady, getApp, reloadDeveloperApps } = useStore()
  const router = useRouter()
  const app = getApp(id)

  useEffect(() => {
    if (authReady && !user) router.replace('/login?next=/dashboard')
  }, [authReady, user, router])


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

  return <EditAppForm key={app.id} app={app} reloadDeveloperApps={reloadDeveloperApps} />
}

function EditAppForm({ app, reloadDeveloperApps }: { app: StoreApp; reloadDeveloperApps: () => Promise<void> }) {
  const [baseline, setBaseline] = useState(app)
  const [saveNotice, setSaveNotice] = useState('')
  const [saveWarning, setSaveWarning] = useState('')
  const [name, setName] = useState(app?.name || '')
  const [nameEn, setNameEn] = useState(app?.nameEn || '')
  const [tagline, setTagline] = useState(app?.tagline || '')
  const [description, setDescription] = useState(app?.description || '')
  const [taglineEn, setTaglineEn] = useState(app?.taglineEn || '')
  const [descriptionEn, setDescriptionEn] = useState(app?.descriptionEn || '')
  const [website, setWebsite] = useState(app?.website || '')
  const [supportEmail, setSupportEmail] = useState(app?.supportEmail || '')
  const [packageName, setPackageName] = useState(app?.packageName || '')
  const [categoryId, setCategoryId] = useState(app?.categoryId ? String(app.categoryId) : '')
  const [applicationType, setApplicationType] = useState<'1' | '2'>(app?.applicationType === 2 ? '2' : '1')
  const [ageLimit, setAgeLimit] = useState(String(app?.ageLimit ?? 0))
  const [developedForAndroidTv, setDevelopedForAndroidTv] = useState(Boolean(app?.developedForAndroidTv))
  const [airMouseCompatible, setAirMouseCompatible] = useState(Boolean(app?.airMouseCompatible))
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const appId = app.id

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
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setErrorMessage('فرمت تصویر باید PNG، JPG/JPEG یا WEBP باشد.')
      return false
    }

    const maxSize = kind === 'icon' ? MAX_ICON_SIZE : MAX_IMAGE_SIZE
    if (file.size > maxSize) {
      setErrorMessage('حجم هر تصویر باید حداکثر ۵ مگابایت باشد.')
      return false
    }

    try {
      const { width, height } = await imageDimensions(file)
      if (kind === 'icon' && width !== height) {
        setErrorMessage('نسبت تصویر آیکون باید ۱:۱ باشد.')
        return false
      }
      if ((kind === 'banner' || kind === 'screenshot') && Math.abs(width / height - 16 / 9) > 0.01) {
        setErrorMessage('نسبت تصویر بنر و اسکرین‌شات باید ۱۶:۹ باشد.')
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
      setErrorMessage('حداکثر ۲۰ اسکرین‌شات قابل ثبت است.')
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
    setFieldErrors({})
    setErrorMessage('')
    setSaveNotice('')
    setSaveWarning('')
    const patch = changedDeveloperMetadata(baseline, {
      packageName, name, nameEn, shortDescription: tagline, shortDescriptionEn: taglineEn,
      longDescription: description, longDescriptionEn: descriptionEn, categoryId,
      applicationType, ageLimit, supportsNetboxPayment,
      isAndroidTv: developedForAndroidTv, isAirMouseCompatible: airMouseCompatible,
    })

    if (['name', 'shortDescription', 'longDescription'].some((field) => field in patch && !patch[field])) {
      setErrorMessage('عنوان، توضیح کوتاه و توضیحات کامل فارسی نمی‌توانند خالی باشند.')
      return
    }
    if ('packageName' in patch && !/^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(patch.packageName)) {
      setErrorMessage('Package Name معتبر نیست. نمونه صحیح: com.company.app')
      return
    }
    if ('categoryId' in patch && (!/^\d+$/.test(patch.categoryId) || Number(patch.categoryId) <= 0)) {
      setErrorMessage('یک دسته‌بندی معتبر انتخاب کنید.')
      return
    }
    if ('ageLimit' in patch && (!/^\d+$/.test(patch.ageLimit) || Number(patch.ageLimit) > 99)) {
      setErrorMessage('محدودیت سنی باید عددی بین ۰ تا ۹۹ باشد.')
      return
    }
    if (!Object.keys(patch).length && !iconFile && !bannerFile && !backgroundFile && !replacementScreenshots.length) {
      setSaveNotice('اطلاعات قابل ذخیره تغییری نکرده است.')
      return
    }

    if (replacementScreenshots.length > 10 || [iconFile, bannerFile, backgroundFile, ...replacementScreenshots].some((file) => file?.type === 'image/webp') || (iconFile && iconFile.size > 2 * 1024 * 1024)) {
      setErrorMessage('فرم قبلی بازگردانده شده، اما API فعلی حداکثر ۱۰ تصویر PNG/JPEG و آیکون تا ۲ مگابایت می‌پذیرد. اتصال محدودیت‌های قبلی باید تکمیل شود.')
      return
    }
    setSaving(true)
    setSaved(false)
    setUploadProgress(0)
    setErrorMessage('')

    const formData = new FormData()
    for (const [field, value] of Object.entries(patch)) formData.append(field, value)
    if (iconFile) formData.append('icon', iconFile)
    if (bannerFile) formData.append('banner', bannerFile)
    if (backgroundFile) formData.append('backgroundImage', backgroundFile)
    replacementScreenshots.forEach((file) => formData.append('screenshots', file))

    try {
      await patchDeveloperHubMultipart(
        '/api/v1/developer-hub/apps/' + encodeURIComponent(appId) + '/',
        formData,
        (percent) => setUploadProgress(Math.round(percent)),
      )
      setUploadProgress(100)
      // Read the listing back through the authenticated BFF before reporting success.
      let confirmed = false
      try {
        const response = await fetch(`/api/developer-hub/apps/${encodeURIComponent(appId)}`, { cache: 'no-store' })
        const detail = await response.json().catch(() => null)
        if (!response.ok || !detail || String(detail.id) !== appId) throw new Error('verification_unavailable')
        const missing = unconfirmedDeveloperMetadata(patch, detail)
        if (missing.length) {
          setSaveWarning(missing.includes('packageName')
            ? 'درخواست ذخیره پذیرفته شد، اما بک‌اند هنوز Package Name قبلی را برمی‌گرداند. ذخیره پکیج‌نیم تأیید نشد؛ مقدار واردشده در فرم حفظ شده است.'
            : 'درخواست ذخیره پذیرفته شد، اما دریافت دوباره اطلاعات، همه تغییرات را تأیید نکرد. مقدارهای واردشده در فرم حفظ شده‌اند.')
        } else {
          confirmed = true
          setBaseline(mapDeveloperHubApp(detail, app.developer))
          setSaved(true)
          setSaveNotice('packageName' in patch ? `Package Name «${detail.packageName}» در بک‌اند ذخیره و دوباره تأیید شد.` : 'تغییرات در بک‌اند ذخیره و دریافت دوباره اطلاعات تأیید شد.')
        }
      } catch {
        setSaveWarning('درخواست ذخیره پذیرفته شد، اما خواندن دوباره اطلاعات برای تأیید انجام نشد. مقدارهای فرم حفظ شده‌اند؛ این پیام به معنی ردشدن ذخیره نیست.')
      }
      try { await reloadDeveloperApps() } catch {
        if (confirmed) setSaveWarning('ذخیره تأیید شد، اما تازه‌سازی داشبورد انجام نشد.')
      }
    } catch (error) {
      setFieldErrors(developerHubFieldErrors(error))
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

      <form onSubmit={save} onChange={() => { setSaved(false); setSaveNotice(''); setSaveWarning('') }} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <Field error={fieldErrors.name} label="عنوان اپلیکیشن (فارسی)" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} />
        </Field>
        <Field error={fieldErrors.nameEn} label="عنوان اپلیکیشن (English) — اختیاری">
          <Input value={nameEn} onChange={(event) => setNameEn(event.target.value)} maxLength={255} dir="ltr" />
        </Field>
        <Field error={fieldErrors.shortDescription} label="توضیح کوتاه (فارسی)" required>
          <Textarea value={tagline} onChange={(event) => setTagline(event.target.value)} maxLength={1000} rows={3} />
        </Field>
        <Field error={fieldErrors.shortDescriptionEn} label="Short description (English) — اختیاری"><Input maxLength={1000} value={taglineEn} onChange={(event) => setTaglineEn(event.target.value)} dir="ltr" /></Field>
        <Field error={fieldErrors.longDescription} label="توضیحات کامل (فارسی)" required>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} rows={7} />
        </Field>

        <Field error={fieldErrors.longDescriptionEn} label="Full description (English) — اختیاری"><Textarea maxLength={20000} value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)} dir="ltr" rows={6} /></Field>
        <Field error={fieldErrors.packageName} label="Package Name" required>
          <Input readOnly={app.isPublished} value={packageName} onChange={(event) => setPackageName(event.target.value.trim())} maxLength={100} dir="ltr" />
          <p className="text-xs leading-6 text-muted-foreground">{app.isPublished ? 'Package Name اپ منتشرشده قابل تغییر نیست.' : 'تا قبل از انتشار می‌توانید Package Name را اصلاح کنید؛ این مقدار باید با شناسه داخل APK یکسان باشد.'}</p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldErrors.categoryId} label="دسته‌بندی" required>
            <DeveloperCategorySelect value={categoryId} onChange={setCategoryId} />
          </Field>

          <Field error={fieldErrors.applicationType} label="نوع اپلیکیشن">
            <Select value={applicationType} onValueChange={(value) => value && setApplicationType(value as '1' | '2')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">برنامه</SelectItem>
                <SelectItem value="2">بازی</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field error={fieldErrors.ageLimit} label="محدودیت سنی">
            <Select value={ageLimit} onValueChange={(value) => value && setAgeLimit(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[['0', 'همه سنین'], ['7', '+۷'], ['12', '+۱۲'], ['15', '+۱۵'], ['18', '+۱۸'], ...(!['0', '7', '12', '15', '18'].includes(ageLimit) ? [[ageLimit, ageLimit]] : [])].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        {['supportsNetboxPayment', 'isAndroidTv', 'isAirMouseCompatible'].map((field) => fieldErrors[field] && <p key={field} role="alert" className="text-sm text-destructive">{fieldErrors[field]}</p>)}
        <PaymentCommitmentSummary app={app} />
        <div className="rounded-xl border border-border p-4 text-sm leading-7">
          <p>پرداخت درون‌برنامه‌ای: {app.hasInAppPayment ? 'دارد' : 'ندارد'} — تعهد پرداخت پس از اولین ارسال قابل ویرایش نیست.</p>
          <label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={developedForAndroidTv} onChange={(event) => setDevelopedForAndroidTv(event.target.checked)} />این اپ مخصوص Android TV توسعه داده شده است.</label>
          <label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={airMouseCompatible} onChange={(event) => setAirMouseCompatible(event.target.checked)} />این اپ با ایرماوس یا ماوس سازگار است.</label>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 text-sm leading-7">
          <input type="checkbox" checked={supportsNetboxPayment} onChange={(event) => setSupportsNetboxPayment(event.target.checked)} className="mt-1 size-4" />
          <span>این اپ از Netbox Payment پشتیبانی می‌کند.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="آدرس وبسایت"><Input value={website} onChange={(event) => setWebsite(event.target.value)} dir="ltr" type="url" /></Field>
          <Field label="ایمیل پشتیبانی"><Input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} dir="ltr" type="email" /></Field>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">فایل APK از صفحه ویرایش تغییر نمی‌کند. برای انتشار APK جدید از بخش «نسخه جدید» استفاده کنید تا تاریخچه نسخه‌ها حفظ شود.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <MediaField
            title="آیکون برنامه (نسبت ۱:۱)"
                error={fieldErrors.icon}
            value={iconPreview}
            square
            hint="PNG، JPG/JPEG یا WEBP — حداکثر ۵MB — نسبت ۱:۱"
            onFile={(file) => void chooseSingle(file, 'icon')}
            onClear={() => { setIconFile(null); setIconPreview(app.icon || '') }}
          />
          <MediaField
            title="بنر معرفی (نسبت ۱۶:۹)"
                error={fieldErrors.banner}
            value={bannerPreview}
            hint="PNG، JPG/JPEG یا WEBP — حداکثر ۵MB — نسبت ۱۶:۹"
            onFile={(file) => void chooseSingle(file, 'banner')}
            onClear={() => { setBannerFile(null); setBannerPreview(app.banner || '') }}
          />
          <MediaField
            title="تصویر پس‌زمینه"
                error={fieldErrors.backgroundImage}
            value={backgroundPreview}
            hint="PNG یا JPEG — حداکثر ۵MB"
            onFile={(file) => void chooseSingle(file, 'background')}
            onClear={() => { setBackgroundFile(null); setBackgroundPreview(app.backgroundImage || '') }}
          />
        </div>

        <Field error={fieldErrors.screenshots} label="اسکرین‌شات‌ها">
          <p className="text-xs leading-6 text-muted-foreground">
            اگر فایل جدید انتخاب کنید، کل مجموعه اسکرین‌شات‌های قبلی با مجموعه جدید جایگزین می‌شود. حداکثر ۲۰ تصویر، هرکدام حداکثر ۵MB با نسبت ۱۶:۹.
          </p>
          <div className="mt-2">
            <FileDropzone
              accept="image/png,image/jpeg,image/webp"
              label="انتخاب مجموعه جدید اسکرین‌شات‌ها"
              hint="PNG، JPG/JPEG یا WEBP — حداکثر ۲۰ فایل"
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

        {saveNotice && <div role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">
          <p>{saveNotice}</p>
          {saved && app.latestSubmissionStatus === 'parse_failed' && <>
            <p className="mt-2">خطای پکیج‌نیمِ آخرین ارسال APK به همان ارسال قبلی مربوط است. ذخیره اطلاعات، پردازش آن فایل را تکرار نمی‌کند؛ برای بررسی دوباره، APK را مجدداً ارسال کنید.</p>
            {app.canSubmit && <Button render={<Link href={`/dashboard/version/${app.id}`} />} className="mt-3">ارسال APK برای بررسی مجدد</Button>}
          </>}
        </div>}
        {saveWarning && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-7">{saveWarning}</p>}

        {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm leading-7 text-destructive">{errorMessage}</p>}

        <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-7">وب‌سایت و ایمیل پشتیبانی فقط در همین فرم نمایش داده می‌شوند و با ذخیره تغییرات به بک‌اند ارسال نمی‌شوند. با خروج از فرم یا بارگذاری مجدد صفحه، تغییرات این فیلدها حفظ نمی‌شوند.</p>

        <Button type="submit" disabled={saving || saved} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'در حال ذخیره...' : saved ? 'ذخیره شد' : 'ذخیره تغییرات'}
        </Button>
      </form>
    </main>
  )
}

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5"><Label>{label} {required && <span className="text-destructive">*</span>}</Label>{children}{error && <p role="alert" className="text-xs text-destructive">{error}</p>}</div>
}

function MediaField({
  title,
  error,
  value,
  square,
  hint,
  onFile,
  onClear,
}: {
  title: string
  error?: string
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
          accept="image/png,image/jpeg,image/webp"
          label="انتخاب فایل جدید"
          hint={hint}
          compact
          onFiles={(files) => files[0] && onFile(files[0])}
        />
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      {value && <button type="button" onClick={onClear} className="mt-2 text-xs text-muted-foreground hover:text-foreground">لغو انتخاب فایل جدید</button>}
    </div>
  )
}

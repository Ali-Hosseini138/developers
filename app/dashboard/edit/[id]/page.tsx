'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Loader2, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { appDescription, shortAppDescription } from '@/lib/app-description'
import { developerMetadataLabels, changedDeveloperMetadata, unconfirmedDeveloperMetadata } from '@/lib/developer-hub-patch'
import { mapDeveloperHubApp } from '@/lib/developer-hub-model'
import type { StoreApp } from '@/lib/types'
import { LoadFailure } from '@/components/load-failure'
import { useStore } from '@/components/store-provider'
import { PaymentCommitmentSummary } from '@/components/payment-commitment-summary'
import { FileDropzone } from '@/components/upload/file-dropzone'
import { DeveloperCategorySelect } from '@/components/upload/developer-category-select'
import { developerHubFieldErrors, developerHubErrorMessage, patchDeveloperHubMultipart } from '@/lib/developer-hub-client'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_ICON_SIZE = 2 * 1024 * 1024
const MAX_SCREENSHOTS = 10

type ImageKind = 'icon' | 'banner' | 'background' | 'screenshot'

export default function EditAppPage() {
  const { id } = useParams<{ id: string }>()
  const { user, authReady, sessionError, myApps, developerAppsLoading, developerAppsError, reloadDeveloperApps } = useStore()
  const router = useRouter()
  const app = myApps.find(item => item.id === id)

  useEffect(() => {
    if (authReady && !sessionError && !user) router.replace('/login?next=/dashboard')
  }, [authReady, sessionError, user, router])


  if (!authReady || (!sessionError && Boolean(user) && !app && developerAppsLoading)) {
    return <main className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری اپلیکیشن...</span></main>
  }
  if (sessionError) return <LoadFailure message={sessionError} />
  if (!user) return null
  if (!app && developerAppsError) return <LoadFailure message={developerAppsError} retry={() => { void reloadDeveloperApps().catch(() => {}) }} />
  if (!app) {
    return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">این اپلیکیشن پیدا نشد یا به حساب شما تعلق ندارد.</div></main>
  }
  if (!app.canEdit) {
    return <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="text-sm text-primary">بازگشت به داشبورد</Link><div className="mt-6 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">در حال حاضر ویرایش اطلاعات این اپلیکیشن مجاز نیست. </div></main>
  }

  return <>{developerAppsError && <LoadFailure message={developerAppsError} retry={() => { void reloadDeveloperApps().catch(() => {}) }} />}<EditAppForm key={app.id} app={app.draft || app} reloadDeveloperApps={reloadDeveloperApps} /></>
}

function EditAppForm({ app, reloadDeveloperApps }: { app: StoreApp; reloadDeveloperApps: () => Promise<void> }) {
  const [baseline, setBaseline] = useState(app)
  const [saveNotice, setSaveNotice] = useState('')
  const [saveWarning, setSaveWarning] = useState('')
  const [name, setName] = useState(app?.name || '')
  const [nameEn, setNameEn] = useState(app?.nameEn || '')
  const tagline = baseline.tagline || ''
  const [description, setDescription] = useState(app?.description || '')
  const taglineEn = baseline.taglineEn || ''
  const [descriptionEn, setDescriptionEn] = useState(app?.descriptionEn || '')
  const [website, setWebsite] = useState(app?.website || '')
  const [supportEmail, setSupportEmail] = useState(app?.supportEmail || '')
  const [packageName, setPackageName] = useState(app?.packageName || '')
  const [categoryId, setCategoryId] = useState(app?.categoryId ? String(app.categoryId) : '')
  const [applicationType, setApplicationType] = useState<'1' | '2'>(app?.applicationType === 2 ? '2' : '1')
  const [ageLimit, setAgeLimit] = useState(String(app?.ageLimit ?? 0))
  const [developedForAndroidTv, setDevelopedForAndroidTv] = useState(Boolean(app?.developedForAndroidTv))
  const [airMouseCompatible, setAirMouseCompatible] = useState(Boolean(app?.airMouseCompatible))
  const [supportsSso, setSupportsSso] = useState(Boolean(app.supportsSso))
  const [supportsNetboxPayment, setSupportsNetboxPayment] = useState(Boolean(app?.supportsNetboxPayment))

  const [hasInAppPayment, setHasInAppPayment] = useState(Boolean(app.hasInAppPayment))
  const [paymentCommitmentAccepted, setPaymentCommitmentAccepted] = useState(false)
  const [removeIcon, setRemoveIcon] = useState(false)
  const [clearScreenshots, setClearScreenshots] = useState(false)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [replacementScreenshots, setReplacementScreenshots] = useState<File[]>([])

  const [iconPreview, setIconPreview] = useState(app?.icon || '')
  const [bannerPreview, setBannerPreview] = useState(app?.banner || '')
  const [backgroundPreview, setBackgroundPreview] = useState(app?.backgroundImage || '')
  const [replacementPreviews, setReplacementPreviews] = useState<string[]>([])

  const submitting = useRef(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const mediaReading = useRef(false)
  const [mediaBusy, setMediaBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const appId = app.id
  const unsavedChanges = Object.keys(changedDeveloperMetadata(baseline, {
    developerEmail: supportEmail.trim(), developerWebsite: website.trim(), packageName, name, nameEn,
    shortDescription: tagline, shortDescriptionEn: taglineEn, longDescription: description !== baseline.description || developedForAndroidTv !== Boolean(baseline.developedForAndroidTv) || airMouseCompatible !== Boolean(baseline.airMouseCompatible) ? appDescription(description, !developedForAndroidTv && airMouseCompatible) : description,
    longDescriptionEn: descriptionEn, categoryId, applicationType, ageLimit, supportsNetboxPayment, supportsSso,
    isAndroidTv: developedForAndroidTv, isAirMouseCompatible: airMouseCompatible,
  })).length > 0 || hasInAppPayment !== Boolean(baseline.hasInAppPayment) || paymentCommitmentAccepted || removeIcon || clearScreenshots || Boolean(iconFile || bannerFile || backgroundFile || replacementScreenshots.length)


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
      if (kind === 'icon' && width !== height) {
        setErrorMessage('نسبت تصویر آیکون باید ۱:۱ باشد.')
        return false
      }
      if (kind === 'icon' && (width < 128 || height < 128)) {
        setErrorMessage('ابعاد آیکون باید حداقل ۱۲۸×۱۲۸ باشد.')
        return false
      }
      if ((kind === 'banner' || kind === 'screenshot') && width / height < 1.5) {
        setErrorMessage('بنر و تصاویر محیط اپلیکیشن باید افقی و نسبت عرض به ارتفاع حداقل ۱٫۵ داشته باشند.')
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
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => { setter(String(reader.result)); resolve() }
      reader.onerror = () => reject(new Error('image_read_failed'))
      reader.readAsDataURL(file)
    })
  }

  async function chooseSingle(file: File, kind: Exclude<ImageKind, 'screenshot'>) {
    if (mediaReading.current || submitting.current) return
    mediaReading.current = true; setMediaBusy(true)
    try {
      if (!(await validateImage(file, kind))) return

      if (kind === 'icon') {
        setRemoveIcon(false)
        await preview(file, setIconPreview)
        setIconFile(file)
      } else if (kind === 'banner') {
        await preview(file, setBannerPreview)
        setBannerFile(file)
      } else {
        await preview(file, setBackgroundPreview)
        setBackgroundFile(file)
      }
    } catch { setErrorMessage('خواندن تصویر انجام نشد؛ دوباره انتخاب کنید.') }
    finally { mediaReading.current = false; setMediaBusy(false) }
  }

  async function chooseScreenshots(files: File[]) {
    if (mediaReading.current || submitting.current) return
    mediaReading.current = true; setMediaBusy(true)
    try {
      const candidates = files.slice(0, MAX_SCREENSHOTS)
      if (files.length > MAX_SCREENSHOTS) {
        setErrorMessage('حداکثر ۱۰ تصویر محیط اپلیکیشن قابل ثبت است.')
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
    } catch { setErrorMessage('خواندن تصاویر انجام نشد؛ دوباره انتخاب کنید.') }
    finally { mediaReading.current = false; setMediaBusy(false) }
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (submitting.current || mediaBusy) return
    if (!developedForAndroidTv && !airMouseCompatible) { setErrorMessage('اپلیکیشن غیر Android TV باید با ایرماوس یا ماوس قابل استفاده باشد.'); return }
    setFieldErrors({})
    setErrorMessage('')
    setSaveNotice('')
    setSaveWarning('')
    const descriptionChanged = description !== baseline.description ||
      developedForAndroidTv !== Boolean(baseline.developedForAndroidTv) ||
      airMouseCompatible !== Boolean(baseline.airMouseCompatible)
    const patch = changedDeveloperMetadata(baseline, {
      developerEmail: supportEmail.trim(), developerWebsite: website.trim(),
      packageName, name, nameEn, shortDescription: descriptionChanged ? shortAppDescription(description) : tagline, shortDescriptionEn: descriptionEn !== baseline.descriptionEn ? shortAppDescription(descriptionEn) : taglineEn,
      longDescription: descriptionChanged ? appDescription(description, !developedForAndroidTv && airMouseCompatible) : description, longDescriptionEn: descriptionEn, categoryId,
      applicationType, ageLimit, supportsNetboxPayment, supportsSso,
      isAndroidTv: developedForAndroidTv, isAirMouseCompatible: airMouseCompatible,
    })

    if (hasInAppPayment !== Boolean(baseline.hasInAppPayment)) {
      if (hasInAppPayment && !paymentCommitmentAccepted) {
        setErrorMessage('برای فعال‌کردن پرداخت درون‌برنامه‌ای، تعهد پرداخت را بپذیرید.')
        return
      }
      patch.hasInAppPayment = String(hasInAppPayment)
      patch.paymentCommitmentAccepted = String(hasInAppPayment && paymentCommitmentAccepted)
    } else if (hasInAppPayment && paymentCommitmentAccepted) {
      patch.paymentCommitmentAccepted = 'true'
    }
    if (patch.longDescription?.length > 20000) {
      setErrorMessage('با احتساب متن ایرماوس، توضیحات باید حداکثر ۲۰۰۰۰ نویسه باشد.')
      return
    }
    if (['name', 'shortDescription', 'longDescription'].some((field) => field in patch && !patch[field])) {
      setErrorMessage('عنوان و توضیحات فارسی نمی‌توانند خالی باشند.')
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
    if (!Object.keys(patch).length && !removeIcon && !iconFile && !bannerFile && !backgroundFile && !replacementScreenshots.length && !clearScreenshots) {
      setSaveNotice('اطلاعات قابل ذخیره تغییری نکرده است.')
      return
    }

    if (replacementScreenshots.length > 10 || [iconFile, bannerFile, backgroundFile, ...replacementScreenshots].some((file) => file?.type === 'image/webp') || (iconFile && iconFile.size > 2 * 1024 * 1024)) {
      setErrorMessage('حداکثر ۱۰ تصویر PNG/JPEG و آیکون تا ۲ مگابایت انتخاب کنید.')
      return
    }
    submitting.current = true
    setSaving(true)
    setSaved(false)
    setUploadProgress(0)
    setErrorMessage('')

    const formData = new FormData()
    for (const [field, value] of Object.entries(patch)) formData.append(field, value)
    if (removeIcon) formData.append('removeIcon', 'true')
    else if (iconFile) formData.append('icon', iconFile)
    if (bannerFile) formData.append('banner', bannerFile)
    if (backgroundFile) formData.append('backgroundImage', backgroundFile)
    if (clearScreenshots) formData.append('clearScreenshots', 'true')
    else replacementScreenshots.forEach((file) => formData.append('screenshots', file))

    try {
      const patched = await patchDeveloperHubMultipart(
        '/api/v1/developer-hub/apps/' + encodeURIComponent(appId) + '/',
        formData,
        (percent) => setUploadProgress(Math.round(percent)),
      )
      setUploadProgress(100)
      setRemoveIcon(false); setIconFile(null); setBannerFile(null); setBackgroundFile(null)
      setReplacementScreenshots([]); setReplacementPreviews([]); setClearScreenshots(false); setPaymentCommitmentAccepted(false)
      if (String(patched?.id) === appId) { const mapped = mapDeveloperHubApp(patched, app.developer); const editable = mapped.draft || mapped; setBaseline(editable); setIconPreview(editable.icon || ''); setBannerPreview(editable.banner || ''); setBackgroundPreview(editable.backgroundImage || '') }
      // Read the listing back through the authenticated BFF before reporting success.
      let confirmed = false
      try {
        const response = await fetch(`/api/developer-hub/apps/${encodeURIComponent(appId)}`, { cache: 'no-store' })
        if (response.status === 401) { window.location.assign('/login?next=' + encodeURIComponent('/dashboard/edit/' + appId)); return }
        const detail = await response.json().catch(() => null)
        if (!response.ok || !detail || String(detail.id) !== appId) throw new Error('verification_unavailable')
        const missing = unconfirmedDeveloperMetadata(patch, detail)
        const proposal = detail.isPublished ? detail.draft : detail
        if (app.isPublished && (!detail.hasDraft || !proposal)) missing.push('draft')
        if (removeIcon && !(proposal?.removeIcon === true || proposal?.iconUrl === null)) missing.push('icon')
        if (clearScreenshots && (!Array.isArray(proposal?.screenshots) || proposal.screenshots.length)) missing.push('screenshots')
        if (iconFile && !proposal?.iconUrl) missing.push('icon')
        if (bannerFile && !proposal?.bannerUrl) missing.push('banner')
        if (backgroundFile && !proposal?.backgroundImageUrl) missing.push('backgroundImage')
        if (replacementScreenshots.length && (!Array.isArray(proposal?.screenshots) || proposal.screenshots.length !== replacementScreenshots.length)) missing.push('screenshots')
        const mapped = mapDeveloperHubApp(detail, app.developer)
        const editable = mapped.draft || mapped
        setBaseline(editable); setIconPreview(editable.icon || ''); setBannerPreview(editable.banner || ''); setBackgroundPreview(editable.backgroundImage || '')
        if (missing.length) {
          if ('packageName' in patch && !missing.includes('packageName')) {
            setSaveNotice(`Package Name «${detail.packageName}» ذخیره و دوباره تأیید شد.`)
          }
          const fields = missing.map(field => developerMetadataLabels[field] || field).join('، ')
          setSaveWarning(`ذخیره این موارد تأیید نشد: ${fields}. مقدارهای واردشده در فرم حفظ شده‌اند؛ دوباره بررسی کنید.`)
        } else {
          confirmed = true
          setSaved(true)
          setSaveNotice(app.isPublished ? 'پیش‌نویس تغییرات ذخیره شد؛ اطلاعات فروشگاه تا تأیید کارشناس تغییر نمی‌کند.' : 'packageName' in patch ? `Package Name «${detail.packageName}» ذخیره و دوباره تأیید شد.` : 'تغییرات ذخیره و دریافت دوباره اطلاعات تأیید شد.')
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
      submitting.current = false
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
        <p className="text-sm font-semibold text-primary">ویرایش اطلاعات اپلیکیشن</p>
        <h1 className="mt-2 text-3xl font-bold">ویرایش {app.name}</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">اطلاعات و تصاویر اپلیکیشن خود را ویرایش کنید.</p>
        {app.isPublished && <p className="mt-3 rounded-xl bg-primary/5 p-4 text-sm leading-7">تغییرات ابتدا به‌صورت پیش‌نویس ذخیره می‌شوند. سپس آن‌ها را برای بررسی ارسال کنید؛ نسخه فعلی فروشگاه تا تأیید کارشناس حفظ می‌شود.</p>}
      </div>

      <form onSubmit={save} onChange={() => { setSaved(false); setSaveNotice(''); setSaveWarning('') }} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6">
        <fieldset disabled={saving || mediaBusy} className="contents">
        <Field error={fieldErrors.name} label="عنوان اپلیکیشن (فارسی)" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} />
        </Field>
        <Field error={fieldErrors.nameEn} label="عنوان اپلیکیشن (English) — اختیاری">
          <Input value={nameEn} onChange={(event) => setNameEn(event.target.value)} maxLength={255} dir="ltr" />
        </Field>
        <Field error={fieldErrors.longDescription} label="توضیحات (فارسی)" required>
          <p className="text-xs text-muted-foreground">در صفحه جزئیات اپلیکیشن شما نمایش داده می‌شود.</p>
          <Textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={20000} rows={7} />
        </Field>

        <Field error={fieldErrors.longDescriptionEn} label="توضیحات (English) — اختیاری"><Textarea maxLength={20000} value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)} dir="ltr" rows={6} /></Field>
        <Field error={fieldErrors.packageName} label="Package Name" required>
          <Input readOnly={app.isPublished} value={packageName} onChange={(event) => setPackageName(event.target.value.trim())} maxLength={100} dir="ltr" />
          <p className="text-xs leading-6 text-muted-foreground">{app.isPublished ? 'Package Name اپلیکیشن منتشرشده قابل تغییر نیست.' : 'تا قبل از انتشار می‌توانید Package Name را اصلاح کنید؛ این مقدار باید با شناسه داخل APK یکسان باشد.'}</p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field error={fieldErrors.categoryId} label="دسته‌بندی" required>
            <DeveloperCategorySelect value={categoryId} onChange={setCategoryId} />
          </Field>

          <Field error={fieldErrors.applicationType} label="نوع اپلیکیشن">
            <Select value={applicationType} onValueChange={(value) => value && setApplicationType(value as '1' | '2')}>
              <SelectTrigger><SelectValue>{applicationType === '2' ? 'بازی' : 'برنامه'}</SelectValue></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">برنامه</SelectItem>
                <SelectItem value="2">بازی</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field error={fieldErrors.ageLimit} label="محدودیت سنی">
            <Select value={ageLimit} onValueChange={(value) => value && setAgeLimit(value)}>
              <SelectTrigger><SelectValue>{({ '0': 'همه سنین', '7': '+۷', '12': '+۱۲', '15': '+۱۵', '18': '+۱۸' } as Record<string, string>)[ageLimit] || 'انتخاب محدودیت سنی'}</SelectValue></SelectTrigger>
              <SelectContent>{[['0', 'همه سنین'], ['7', '+۷'], ['12', '+۱۲'], ['15', '+۱۵'], ['18', '+۱۸'], ...(!['0', '7', '12', '15', '18'].includes(ageLimit) ? [[ageLimit, ageLimit]] : [])].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        {['supportsSso', 'supportsNetboxPayment', 'hasInAppPayment', 'paymentCommitmentAccepted', 'isAndroidTv', 'isAirMouseCompatible'].map((field) => fieldErrors[field] && <p key={field} role="alert" className="text-sm text-destructive">{fieldErrors[field]}</p>)}
        <div className="rounded-xl border border-border p-4 text-sm leading-7">
          <label className="flex items-start gap-3"><input type="checkbox" checked={supportsSso} onChange={event => setSupportsSso(event.target.checked)} className="mt-2" />ورود یکپارچه با نت‌باکس را پیاده‌سازی کرده‌ام.</label>
          <Link href="/integrations/sso" target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-primary underline">راهنمای پیاده‌سازی ورود یکپارچه</Link>
        </div>
        <PaymentCommitmentSummary app={app} />
        <div className="rounded-xl border border-border p-4 text-sm leading-7">
          <label className="flex items-center gap-3"><input type="checkbox" checked={hasInAppPayment} onChange={event => { setHasInAppPayment(event.target.checked); setPaymentCommitmentAccepted(false); if (!event.target.checked) setSupportsNetboxPayment(false) }} />این اپلیکیشن پرداخت درون‌برنامه‌ای دارد.</label>
          {hasInAppPayment && <div className="mt-3 space-y-2">
            <p><Link href="/integrations/payment" target="_blank" rel="noopener noreferrer" className="text-primary underline">مستندات نت‌باکس پیمنت</Link></p>
            <label className="flex items-center gap-3"><input type="radio" name="edit-payment" checked={supportsNetboxPayment} onChange={() => setSupportsNetboxPayment(true)} />نت‌باکس پیمنت را پیاده‌سازی کرده‌ام.</label>
            <label className="flex items-center gap-3"><input type="radio" name="edit-payment" checked={!supportsNetboxPayment} onChange={() => setSupportsNetboxPayment(false)} />متعهد به پیاده‌سازی نت‌باکس پیمنت در مهلت مقرر هستم.</label>
            {(!baseline.hasInAppPayment || fieldErrors.paymentCommitmentAccepted) && <label className="flex items-start gap-3"><input type="checkbox" checked={paymentCommitmentAccepted} onChange={event => setPaymentCommitmentAccepted(event.target.checked)} className="mt-2" />تعهد تکمیل الزامات پرداخت در مهلت یک‌ماهه را می‌پذیرم؛ تاریخ دقیق پس از ذخیره نمایش داده می‌شود.</label>}
          </div>}
          <label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={developedForAndroidTv} onChange={(event) => setDevelopedForAndroidTv(event.target.checked)} />این اپلیکیشن مخصوص Android TV توسعه داده شده است.</label>
          <label className="mt-3 flex items-center gap-3"><input type="checkbox" checked={airMouseCompatible} onChange={(event) => setAirMouseCompatible(event.target.checked)} />این اپلیکیشن با ایرماوس یا ماوس سازگار است.</label>
        </div>


        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="آدرس وبسایت"><Input value={website} onChange={(event) => setWebsite(event.target.value)} dir="ltr" type="url" /></Field>
          <Field label="ایمیل پشتیبانی"><Input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} dir="ltr" type="email" /></Field>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">فایل APK از صفحه ویرایش تغییر نمی‌کند. پس از ذخیره پیش‌نویس می‌توانید تغییرات را بدون APK یا همراه APK جدید برای بررسی ارسال کنید تا تاریخچه نسخه‌ها حفظ شود.</p>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={removeIcon} onChange={event => { setRemoveIcon(event.target.checked); if (event.target.checked) setIconFile(null) }} />حذف آیکون توسعه‌دهنده از پیش‌نویس</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <MediaField
            title="آیکون برنامه (مربع، حداقل ۱۲۸×۱۲۸)"
                error={fieldErrors.icon}
            value={removeIcon ? '' : iconPreview}
            square
            hint="PNG یا JPEG — حداکثر ۲MB — مربع، حداقل ۱۲۸×۱۲۸"
            onFile={(file) => void chooseSingle(file, 'icon')}
            onClear={() => { setIconFile(null); setRemoveIcon(false); setIconPreview(baseline.icon || '') }}
          />
          <MediaField
            title="بنر معرفی"
                error={fieldErrors.banner}
            value={bannerPreview}
            hint="PNG یا JPEG — حداکثر ۵MB — افقی، نسبت حداقل ۱٫۵"
            onFile={(file) => void chooseSingle(file, 'banner')}
            onClear={() => { setBannerFile(null); setBannerPreview(baseline.banner || '') }}
          />
          <MediaField
            title="تصویر پس‌زمینه"
                error={fieldErrors.backgroundImage}
            value={backgroundPreview}
            hint="PNG یا JPEG — حداکثر ۵MB"
            onFile={(file) => void chooseSingle(file, 'background')}
            onClear={() => { setBackgroundFile(null); setBackgroundPreview(baseline.backgroundImage || '') }}
          />
        </div>

        <Field error={fieldErrors.screenshots} label="تصاویر محیط اپلیکیشن">
          <p className="text-xs leading-6 text-muted-foreground">
            اگر فایل جدید انتخاب کنید، کل مجموعه تصاویر محیط اپلیکیشنی قبلی با مجموعه جدید جایگزین می‌شود. حداکثر ۱۰ تصویر، هرکدام حداکثر ۵MB با افقی، نسبت حداقل ۱٫۵.
          </p>
          <div className="mt-2">
            <FileDropzone
              accept="image/png,image/jpeg"
              label="انتخاب مجموعه جدید تصاویر محیط اپلیکیشن"
              hint="PNG یا JPEG — حداکثر ۱۰ فایل"
              multiple
              onFiles={(files) => { setClearScreenshots(false); void chooseScreenshots(files) }}
            />
          </div>

          <label className="mt-3 flex items-center gap-3 text-sm"><input type="checkbox" checked={clearScreenshots} onChange={event => { setClearScreenshots(event.target.checked); if (event.target.checked) { setReplacementScreenshots([]); setReplacementPreviews([]) } }} />حذف همه تصاویر محیط اپلیکیشن از پیش‌نویس</label>
          {clearScreenshots ? <p className="mt-2 text-xs text-muted-foreground">همه تصاویر محیط اپلیکیشن پس از تأیید حذف می‌شوند.</p> : replacementPreviews.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {replacementPreviews.map((src, index) => (
                <div key={src.slice(0, 48) + '-' + index} className="relative">
                  <img src={src} alt={'تصویر محیط اپلیکیشن جدید ' + (index + 1)} className="aspect-video w-full rounded-lg border border-border object-cover" />
                  <button
                    type="button"
                    aria-label={'حذف تصویر محیط اپلیکیشن ' + (index + 1)}
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
          ) : baseline.screenshots.length > 0 ? (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {baseline.screenshots.map((src, index) => (
                <img key={src + '-' + index} src={src} alt={'تصویر محیط اپلیکیشن فعلی ' + (index + 1)} className="aspect-video w-full rounded-lg border border-border object-cover" />
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
          {app.latestSubmissionStatus === 'parse_failed' && <>
            <p className="mt-2">خطای آخرین ارسال APK به همان ارسال قبلی مربوط است. ذخیره اطلاعات، پردازش آن فایل را تکرار نمی‌کند؛ برای بررسی دوباره، APK را مجدداً ارسال کنید.</p>
            {app.canSubmit && <Button render={<Link href={`/dashboard/version/${app.id}`} />} className="mt-3">ارسال APK برای بررسی مجدد</Button>}
          </>}
        </div>}
        {saveWarning && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-7">{saveWarning}</p>}

        {mediaBusy && <p role="status" className="text-sm text-muted-foreground">در حال بررسی و خواندن تصاویر...</p>}
      {errorMessage && <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm leading-7 text-destructive">{errorMessage}</p>}


        <Button type="submit" disabled={saving || mediaBusy} className="gap-2">
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {saving ? 'در حال ذخیره...' : saved ? 'ذخیره شد' : app.isPublished ? 'ذخیره پیش‌نویس' : 'ذخیره تغییرات'}
        </Button>
        {app.isPublished && baseline.hasDraft && app.canSubmit && <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">
          <p>پیش‌نویس ذخیره‌شده آماده ارسال برای بررسی است؛ APK جدید اختیاری است.</p>
          {unsavedChanges || saveWarning ? <p className="mt-2 text-muted-foreground">ابتدا تغییرات فرم را ذخیره و نتیجه ذخیره را تأیید کنید.</p> : <Button render={<Link href={`/dashboard/version/${app.id}`} />} className="mt-3">ادامه و ارسال تغییرات برای بررسی</Button>}
        </div>}
        </fieldset>
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
          accept="image/png,image/jpeg"
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

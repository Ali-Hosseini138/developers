'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2, Rocket, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/components/store-provider'
import { FileDropzone } from '@/components/upload/file-dropzone'
import { developerHubErrorMessage, postDeveloperHubMultipart } from '@/lib/developer-hub-client'
import { toFa } from '@/lib/format'

const steps = ['فایل APK', 'اطلاعات پایه', 'شرایط انتشار', 'اطلاعات نمایشی', 'بازبینی']
const MAX_APK_SIZE = 250 * 1024 * 1024
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const MAX_ICON_SIZE = 5 * 1024 * 1024
const MAX_SCREENSHOTS = 20

type CategoryOption = { id: number; name: string }
type ImageKind = 'icon' | 'banner' | 'background' | 'screenshot'

export default function UploadPage() {
  const { user, authReady, reloadDeveloperApps } = useStore()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [submitProgress, setSubmitProgress] = useState(0)
  const [submitStage, setSubmitStage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const [apkFile, setApkFile] = useState<File | null>(null)
  const [apkName, setApkName] = useState('')
  const [apkSize, setApkSize] = useState('')

  const [name, setName] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [packageName, setPackageName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [applicationType, setApplicationType] = useState<'1' | '2'>('1')
  const [ageLimit, setAgeLimit] = useState('0')

  const [iconFile, setIconFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])

  const [iconPreview, setIconPreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [backgroundPreview, setBackgroundPreview] = useState('')
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([])

  const [hasInAppPayment, setHasInAppPayment] = useState<boolean | null>(null)
  const [netboxPaymentIntegrated, setNetboxPaymentIntegrated] = useState(false)
  const [netboxPaymentGraceAccepted, setNetboxPaymentGraceAccepted] = useState(false)
  const [developedForAndroidTv, setDevelopedForAndroidTv] = useState<boolean | null>(null)
  const [airMouseCompatible, setAirMouseCompatible] = useState(false)
  const [taglineEn, setTaglineEn] = useState('')
  const [descriptionEn, setDescriptionEn] = useState('')
  const [website, setWebsite] = useState('')
  const [supportEmail, setSupportEmail] = useState('')
  const supportsNetboxPayment = hasInAppPayment === true && netboxPaymentIntegrated
  const requirementsValid = hasInAppPayment !== null && developedForAndroidTv !== null &&
    (!hasInAppPayment || netboxPaymentIntegrated || netboxPaymentGraceAccepted) &&
    (developedForAndroidTv || airMouseCompatible)
  // These declarations have no storage/validation contract in the current backend.
  // Keep the restored form reviewable without silently discarding answers on submit.
  const pendingContractFields = [
    'داشتن پرداخت درون‌برنامه‌ای',
    'سازگاری Android TV یا ایرماوس/ماوس',
    ...(netboxPaymentGraceAccepted ? ['مهلت یک‌ماهه Netbox Payment'] : []),
    ...(taglineEn.trim() || descriptionEn.trim() ? ['توضیحات انگلیسی'] : []),
    ...(website.trim() || supportEmail.trim() ? ['وب‌سایت و ایمیل پشتیبانی'] : []),
  ]
  const [changeLog, setChangeLog] = useState('')

  useEffect(() => {
    if (authReady && !user) router.replace('/login?next=/upload')
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

  const valid = useMemo(() => {
    if (step === 1) return Boolean(apkFile)
    if (step === 2) {
      return Boolean(
        name.trim() &&
        tagline.trim() &&
        description.trim() &&
        /^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(packageName.trim()) &&
        /^\d+$/.test(categoryId) &&
        Number(categoryId) > 0 &&
        /^\d+$/.test(ageLimit) &&
        Number(ageLimit) >= 0 &&
        Number(ageLimit) <= 99 && iconFile && bannerFile && backgroundFile
      )
    }
    if (step === 3) return requirementsValid
    return true
  }, [step, apkFile, name, tagline, description, packageName, categoryId, ageLimit, iconFile, bannerFile, backgroundFile, requirementsValid])

  if (!authReady) {
    return <main className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بررسی حساب...</span></main>
  }
  if (!user) return null

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

  function previewFile(file: File, setter: (value: string) => void) {
    const reader = new FileReader()
    reader.onload = () => setter(String(reader.result))
    reader.readAsDataURL(file)
  }

  function selectApk(file?: File) {
    if (!file) return
    setErrorMessage('')

    if (!file.name.toLowerCase().endsWith('.apk')) {
      setApkFile(null)
      setApkName('')
      setApkSize('')
      setErrorMessage('فایل انتخاب‌شده باید با پسوند APK باشد.')
      return
    }

    if (file.size > MAX_APK_SIZE) {
      setApkFile(null)
      setApkName('')
      setApkSize('')
      setErrorMessage('حجم فایل APK نباید بیشتر از ۲۵۰ مگابایت باشد.')
      return
    }

    setApkFile(file)
    setApkName(file.name)
    setApkSize(`${toFa((file.size / 1024 / 1024).toFixed(1))} مگابایت`)
  }

  async function selectSingleImage(file: File, kind: ImageKind) {
    if (!(await validateImage(file, kind))) return

    if (kind === 'icon') {
      setIconFile(file)
      previewFile(file, setIconPreview)
    } else if (kind === 'banner') {
      setBannerFile(file)
      previewFile(file, setBannerPreview)
    } else {
      setBackgroundFile(file)
      previewFile(file, setBackgroundPreview)
    }
  }

  async function selectScreenshots(files: File[]) {
    const remaining = Math.max(0, MAX_SCREENSHOTS - screenshotFiles.length)
    const candidates = files.slice(0, remaining)
    if (!candidates.length) {
      setErrorMessage('حداکثر ۲۰ اسکرین‌شات قابل ثبت است.')
      return
    }

    const existingKeys = new Set(screenshotFiles.map((file) => `${file.name}:${file.size}:${file.lastModified}`))
    const unique = candidates.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`
      if (existingKeys.has(key)) return false
      existingKeys.add(key)
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

    setScreenshotFiles((current) => [...current, ...unique].slice(0, MAX_SCREENSHOTS))
    setScreenshotPreviews((current) => [...current, ...previews].slice(0, MAX_SCREENSHOTS))
    setErrorMessage('')
  }

  function removeScreenshot(index: number) {
    setScreenshotFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setScreenshotPreviews((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  async function submitForReview() {
    if (saving) return
    if (!requirementsValid || !name.trim() || !tagline.trim() || !description.trim()) {
      setErrorMessage('اطلاعات و شرایط انتشار را کامل کنید.')
      return
    }
    if (pendingContractFields.length) {
      setErrorMessage('ارسال هنوز فعال نیست؛ ذخیره این اطلاعات در بک‌اند باید تکمیل شود: ' + pendingContractFields.join('، '))
      return
    }
    if (!apkFile || !iconFile || !bannerFile || !backgroundFile) {
      setErrorMessage('فایل APK، آیکون، بنر و تصویر پس‌زمینه الزامی هستند.')
      return
    }

    setSaving(true)
    setSubmitProgress(0)
    setSubmitStage('در حال ارسال فایل‌ها و اطلاعات به بک‌اند...')
    setErrorMessage('')

    const formData = new FormData()
    formData.append('packageName', packageName.trim())
    formData.append('name', name.trim())
    if (nameEn.trim()) formData.append('nameEn', nameEn.trim())
    formData.append('shortDescription', tagline.trim())
    formData.append('longDescription', description.trim())
    formData.append('categoryId', categoryId)
    formData.append('applicationType', applicationType)
    formData.append('ageLimit', ageLimit)
    formData.append('supportsNetboxPayment', supportsNetboxPayment ? 'true' : 'false')
    formData.append('banner', bannerFile)
    formData.append('backgroundImage', backgroundFile)
    if (iconFile) formData.append('icon', iconFile)
    screenshotFiles.forEach((file) => formData.append('screenshots', file))
    formData.append('apkFile', apkFile)
    if (changeLog.trim()) formData.append('changeLog', changeLog.trim())

    try {
      await postDeveloperHubMultipart('/api/v1/developer-hub/apps/', formData, (percent) => {
        setSubmitProgress(Math.round(percent))
        if (percent >= 100) setSubmitStage('آپلود کامل شد؛ درخواست در حال پردازش است...')
      })

      setSubmitProgress(100)
      setSubmitStage('درخواست با موفقیت ثبت شد')
      await reloadDeveloperApps()
      await new Promise((resolve) => window.setTimeout(resolve, 400))
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      setErrorMessage(developerHubErrorMessage(error, 'ارسال اپلیکیشن انجام نشد. دوباره تلاش کنید.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Rocket className="size-5" /></span>
        <div>
          <h1 className="text-2xl font-bold">انتشار اپلیکیشن در نت‌استور</h1>
          <p className="text-sm text-muted-foreground">گام {toFa(step)} از {toFa(steps.length)} — {steps[step - 1]}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4">
        {steps.map((title, index) => (
          <button
            key={title}
            type="button"
            onClick={() => index + 1 < step && setStep(index + 1)}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${index + 1 === step ? 'bg-primary text-primary-foreground' : index + 1 < step ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
          >
            <span className="flex size-6 items-center justify-center rounded-full border border-current text-xs">{index + 1 < step ? <Check className="size-3.5" /> : toFa(index + 1)}</span>
            {title}
          </button>
        ))}
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
        {step === 1 && (
          <div>
            <Header title="فایل APK" text="فایل نسخه‌ای را انتخاب کنید که برای بررسی و انتشار ارسال می‌شود." />
            <div className="mt-6">
              <FileDropzone
                accept=".apk,application/vnd.android.package-archive"
                label="انتخاب فایل APK"
                hint="حداکثر حجم قابل قبول ۲۵۰ مگابایت است."
                onFiles={(files) => selectApk(files[0])}
              />
            </div>
            {apkFile && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <Check className="size-5 text-primary" />
                <div>
                  <p className="font-medium">فایل APK انتخاب شد</p>
                  <p className="mt-1 text-xs text-muted-foreground"><span dir="ltr">{apkName}</span> — {apkSize}</p>
                  <p className="mt-1 text-xs text-muted-foreground">آپلود واقعی فایل همراه ثبت نهایی اپ انجام می‌شود.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <Header title="اطلاعات پایه" text="اطلاعات اصلی اپلیکیشن را وارد کنید." />
            <Field label="عنوان اپلیکیشن (فارسی)" required>
              <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={255} />
              <p className="text-xs leading-6 text-muted-foreground">این عنوان زیر بنر نمایش داده می‌شود و کاربر اپ شما را با این اسم خواهد شناخت.</p>
            </Field>
            <Field label="عنوان اپلیکیشن (English) — اختیاری">
              <Input value={nameEn} onChange={(event) => setNameEn(event.target.value)} maxLength={255} dir="ltr" />
            </Field>
            <Field label="توضیح کوتاه (فارسی)" required>
              <Input value={tagline} onChange={(event) => setTagline(event.target.value)} maxLength={1000} />
            </Field>
            <Field label="Short description (English) — اختیاری"><Input value={taglineEn} onChange={(event) => setTaglineEn(event.target.value)} dir="ltr" /></Field>
            <Field label="توضیحات کامل (فارسی)" required>
              <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={6} maxLength={20000} />
            </Field>
            <Field label="Full description (English) — اختیاری"><Textarea value={descriptionEn} onChange={(event) => setDescriptionEn(event.target.value)} dir="ltr" rows={6} /></Field>
            <Field label="Package Name" required>
              <Input value={packageName} onChange={(event) => setPackageName(event.target.value.trim())} dir="ltr" maxLength={100} placeholder="com.company.app" />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="دسته‌بندی" required>
                {categories.length ? (
                  <Select value={categoryId} onValueChange={(value) => value && setCategoryId(value)}>
                    <SelectTrigger><SelectValue placeholder="انتخاب دسته‌بندی" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <>
                    <Input value={categoryId} onChange={(event) => setCategoryId(event.target.value.replace(/\D/g, ''))} inputMode="numeric" dir="ltr" placeholder="Category ID" />
                    <p className="text-xs leading-6 text-amber-700">API ارسالی endpoint فهرست دسته‌بندی ندارد؛ تا زمان دریافت آن، Category ID باید از تنظیمات بک‌اند مشخص شود.</p>
                  </>
                )}
              </Field>

              <Field label="نوع اپلیکیشن" required>
                <Select value={applicationType} onValueChange={(value) => value && setApplicationType(value as '1' | '2')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">برنامه</SelectItem>
                    <SelectItem value="2">بازی</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field label="محدودیت سنی" required>
                <Select value={ageLimit} onValueChange={(value) => value && setAgeLimit(value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{[['0', 'همه سنین'], ['7', '+۷'], ['12', '+۱۲'], ['15', '+۱۵'], ['18', '+۱۸']].map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <div className="mt-6 border-t border-border pt-6">
            <Header title="تصاویر اپلیکیشن" text="آیکون، بنر و تصاویر محیط اپ را اضافه کنید." />
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <MediaField
                title="بنر معرفی (نسبت ۱۶:۹)"
                required
                preview={bannerPreview}
                hint="PNG، JPG/JPEG یا WEBP، حداکثر ۵ مگابایت، نسبت ۱۶:۹"
                onFile={(file) => void selectSingleImage(file, 'banner')}
                onClear={() => { setBannerFile(null); setBannerPreview('') }}
              />
              <MediaField
                title="تصویر پس‌زمینه"
                required
                preview={backgroundPreview}
                hint="PNG یا JPEG، حداکثر ۵ مگابایت"
                onFile={(file) => void selectSingleImage(file, 'background')}
                onClear={() => { setBackgroundFile(null); setBackgroundPreview('') }}
              />
              <MediaField
                title="آیکون اپلیکیشن (نسبت ۱:۱)"
                required
                preview={iconPreview}
                square
                hint="PNG، JPG/JPEG یا WEBP، حداکثر ۵ مگابایت، نسبت ۱:۱"
                onFile={(file) => void selectSingleImage(file, 'icon')}
                onClear={() => { setIconFile(null); setIconPreview('') }}
              />
            </div>

            <Field label="اسکرین‌شات‌ها — اختیاری">
              <FileDropzone
                accept="image/png,image/jpeg,image/webp"
                label="افزودن اسکرین‌شات"
                hint="حداکثر ۲۰ تصویر؛ PNG، JPG/JPEG یا WEBP تا ۵ مگابایت، نسبت ۱۶:۹"
                multiple
                onFiles={(files) => void selectScreenshots(files)}
              />
              {screenshotPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {screenshotPreviews.map((src, index) => (
                    <div key={`${src}-${index}`} className="relative overflow-hidden rounded-xl border border-border">
                      <img src={src} alt={`اسکرین‌شات ${index + 1}`} className="aspect-video w-full object-cover" />
                      <button
                        type="button"
                        aria-label={`حذف اسکرین‌شات ${index + 1}`}
                        onClick={() => removeScreenshot(index)}
                        className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Field>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <Header title="شرایط انتشار" text="دو سؤال زیر مشخص می‌کنند اپ شما با الزامات نت‌استور سازگار است یا نه." />
            <div className="mt-6 flex flex-col gap-6">
              <div className="rounded-2xl border border-border p-5">
                <p className="font-semibold">آیا اپلیکیشن شما پرداخت یا خرید درون‌برنامه‌ای دارد؟</p>
                <div className="mt-4 flex gap-2">
                  <Button type="button" variant={hasInAppPayment === true ? 'default' : 'outline'} onClick={() => { setHasInAppPayment(true); setNetboxPaymentIntegrated(false); setNetboxPaymentGraceAccepted(false) }}>بله</Button>
                  <Button type="button" variant={hasInAppPayment === false ? 'default' : 'outline'} onClick={() => { setHasInAppPayment(false); setNetboxPaymentIntegrated(false); setNetboxPaymentGraceAccepted(false) }}>خیر</Button>
                </div>
                {hasInAppPayment && (
                  <div className="mt-4">
                    <p className="text-sm font-medium">یکی از گزینه‌های زیر را انتخاب کنید:</p>
                    <div className="mt-3 grid gap-3">
                      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-7 transition-colors ${netboxPaymentIntegrated ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <input
                          type="radio"
                          name="netbox-payment-status"
                          checked={netboxPaymentIntegrated}
                          onChange={() => {
                            setNetboxPaymentIntegrated(true)
                            setNetboxPaymentGraceAccepted(false)
                          }}
                          className="mt-1 size-4"
                        />
                        <span>
                          تأیید می‌کنم که برای پرداخت‌های دیجیتال این نسخه، <strong>Netbox Payment</strong> پیاده‌سازی شده است.
                        </span>
                      </label>

                      <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm leading-7 transition-colors ${netboxPaymentGraceAccepted ? 'border-primary bg-primary/5' : 'border-border'}`}>
                        <input
                          type="radio"
                          name="netbox-payment-status"
                          checked={netboxPaymentGraceAccepted}
                          onChange={() => {
                            setNetboxPaymentIntegrated(false)
                            setNetboxPaymentGraceAccepted(true)
                          }}
                          className="mt-1 size-4"
                        />
                        <span>
                          Netbox Payment در حال حاضر در اپلیکیشن پیاده‌سازی نشده است. متعهد می‌شوم حداکثر تا یک ماه پس از انتشار، این قابلیت را پیاده‌سازی کنم. در صورت عدم انجام این الزام در مهلت مقرر، اپلیکیشن می‌تواند از نت‌استور خارج شود.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-border p-5">
                <p className="font-semibold">آیا این اپلیکیشن مشخصاً برای Android TV توسعه داده شده است؟</p>
                <div className="mt-4 flex gap-2">
                  <Button type="button" variant={developedForAndroidTv === true ? 'default' : 'outline'} onClick={() => { setDevelopedForAndroidTv(true); setAirMouseCompatible(false) }}>بله</Button>
                  <Button type="button" variant={developedForAndroidTv === false ? 'default' : 'outline'} onClick={() => { setDevelopedForAndroidTv(false); setAirMouseCompatible(false) }}>خیر</Button>
                </div>
                {developedForAndroidTv === false && (
                  <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-7">
                    <p className="font-semibold">شرط بررسی نسخه غیر Android TV</p>
                    <p className="mt-1 text-muted-foreground">اپ فقط زمانی قابل تأیید است که تمام بخش‌های اصلی آن با ایرماوس یا ماوس به‌راحتی قابل استفاده باشند. در صورت ارسال، عبارت «این اپ با ایرماوس یا ماوس قابل استفاده است.» به‌صورت خودکار به خط اول توضیحات اضافه می‌شود.</p>
                    <label className="mt-3 flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={airMouseCompatible} onChange={(e) => setAirMouseCompatible(e.target.checked)} className="mt-1 size-4" />
                      <span>تأیید می‌کنم اپ با ایرماوس یا ماوس به‌طور کامل و بدون مشکل قابل استفاده است.</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {step === 4 && (
          <div>
            <Header title="اطلاعات نمایشی" text="این اطلاعات در صفحه معرفی اپ نمایش داده می‌شوند." />
            <Field label="آدرس وبسایت"><Input value={website} onChange={(event) => setWebsite(event.target.value)} dir="ltr" type="url" placeholder="https://example.com" /></Field>
            <Field label="ایمیل پشتیبانی"><Input value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} dir="ltr" type="email" placeholder="support@example.com" /></Field>
            <Field label="توضیحات نسخه — اختیاری"><Textarea value={changeLog} onChange={(event) => setChangeLog(event.target.value)} rows={5} maxLength={5000} /></Field>
          </div>
        )}

        {step === 5 && (
          <div>
            <Header title="بازبینی اطلاعات" text="پس از ارسال، بک‌اند APK را پردازش می‌کند و وضعیت در داشبورد به‌روزرسانی می‌شود." />
            <p role="status" className="my-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm leading-7">فرم قبلی بازگردانده شده است. ارسال نهایی تا تکمیل قرارداد ذخیره شرایط انتشار در بک‌اند غیرفعال است تا پاسخ‌های شما حذف نشوند.</p>
            <div className="grid gap-3 text-sm">
              {[
                ['فایل APK', apkName],
                ['عنوان فارسی', name],
                ['عنوان انگلیسی', nameEn || '—'],
                ['Package Name', packageName],
                ['Category ID', categoryId],
                ['نوع', applicationType === '2' ? 'بازی' : 'برنامه'],
                ['محدودیت سنی', ageLimit],
                ['توضیح کوتاه انگلیسی', taglineEn || '—'],
                ['توضیحات کامل انگلیسی', descriptionEn || '—'],
                ['پرداخت درون‌برنامه‌ای', hasInAppPayment ? (netboxPaymentIntegrated ? 'دارد — Netbox Payment پیاده‌سازی شده' : 'دارد — مهلت یک‌ماهه پذیرفته شده') : 'ندارد'],
                ['نسخه مخصوص Android TV', developedForAndroidTv ? 'بله' : 'خیر — قابل استفاده با ایرماوس/ماوس'],
                ['وبسایت', website || '—'],
                ['ایمیل پشتیبانی', supportEmail || '—'],
                ['بنر', bannerFile?.name || '—'],
                ['پس‌زمینه', backgroundFile?.name || '—'],
                ['آیکون', iconFile?.name || 'استخراج از APK'],
                ['اسکرین‌شات‌ها', `${toFa(screenshotFiles.length)} تصویر`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 rounded-xl bg-secondary/60 p-4">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium" dir="ltr">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || saving} className="gap-2">
          <ArrowRight className="size-4" />
          قبلی
        </Button>

        {step < steps.length ? (
          <Button onClick={() => valid && setStep((current) => current + 1)} disabled={!valid || saving} className="gap-2">
            گام بعدی
            <ArrowLeft className="size-4" />
          </Button>
        ) : (
          <Button onClick={() => void submitForReview()} disabled={saving || pendingContractFields.length > 0} className="gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}
            {saving ? 'در حال ارسال...' : 'ارسال برای بررسی'}
          </Button>
        )}
      </div>

      {saving && (
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-medium">{submitStage}</span>
            <span className="font-bold text-primary">{toFa(submitProgress)}٪</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={submitProgress}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${submitProgress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">تا پایان ارسال این صفحه را نبندید.</p>
        </div>
      )}

      {errorMessage && <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{errorMessage}</p>}
      {!valid && step < steps.length && <p className="mt-3 text-center text-xs text-muted-foreground">فیلدهای الزامی را کامل کنید.</p>}
    </main>
  )
}

function Header({ title, text }: { title: string; text: string }) {
  return <div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="mt-5 flex flex-col gap-2"><Label>{label} {required && <span className="text-destructive">*</span>}</Label>{children}</div>
}

function MediaField({
  title,
  required,
  preview,
  hint,
  square = false,
  onFile,
  onClear,
}: {
  title: string
  required?: boolean
  preview: string
  hint: string
  square?: boolean
  onFile: (file: File) => void
  onClear: () => void
}) {
  return (
    <div>
      <Label>{title} {required && <span className="text-destructive">*</span>}</Label>
      {preview ? (
        <div className="relative mt-3">
          <img src={preview} alt={`پیش‌نمایش ${title}`} className={`w-full rounded-xl border object-cover ${square ? 'aspect-square max-w-40' : 'aspect-video'}`} />
          <button type="button" aria-label={`حذف ${title}`} onClick={onClear} className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground">
            <X className="size-3" />
          </button>
        </div>
      ) : (
        <div className="mt-3">
          <FileDropzone accept="image/png,image/jpeg,image/webp" label="افزودن تصویر" hint={hint} onFiles={(files) => files[0] && onFile(files[0])} />
        </div>
      )}
    </div>
  )
}

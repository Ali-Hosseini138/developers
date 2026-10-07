'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, Loader2, Rocket, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/components/store-provider'
import { upload } from '@vercel/blob/client'
import { CATEGORIES, type AppCategory } from '@/lib/types'
import { toFa } from '@/lib/format'

const steps = ['فایل APK', 'اطلاعات پایه', 'شرایط انتشار', 'اطلاعات نمایشی', 'رسانه', 'بازبینی']

export default function UploadPage() {
  const { user, authReady } = useStore()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [apkName, setApkName] = useState('')
  const [apkSize, setApkSize] = useState('')
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AppCategory | ''>('')
  const [packageName, setPackageName] = useState('')
  const [ageRestriction, setAgeRestriction] = useState<'همه سنین' | '+۷' | '+۱۲' | '+۱۵' | '+۱۸'>('همه سنین')
  const [website, setWebsite] = useState('')
  const [email, setEmail] = useState('')
  const [icon, setIcon] = useState('')
  const [banner, setBanner] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [apkFile, setApkFile] = useState<File | null>(null)
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([])
  const [hasInAppPayment, setHasInAppPayment] = useState<boolean | null>(null)
  const [netboxPaymentIntegrated, setNetboxPaymentIntegrated] = useState(false)
  const [developedForAndroidTv, setDevelopedForAndroidTv] = useState<boolean | null>(null)
  const [airMouseCompatible, setAirMouseCompatible] = useState(false)

  const valid = useMemo(() => {
    if (step === 1) return Boolean(apkFile)
    if (step === 2) return Boolean(name.trim() && tagline.trim() && description.trim() && category && /^([A-Za-z][A-Za-z0-9_]*\.)+[A-Za-z][A-Za-z0-9_]*$/.test(packageName.trim()))
    if (step === 3) {
      if (hasInAppPayment === null || developedForAndroidTv === null) return false
      if (hasInAppPayment && !netboxPaymentIntegrated) return false
      if (!developedForAndroidTv && !airMouseCompatible) return false
      return true
    }
    if (step === 5) return Boolean(iconFile && bannerFile)
    return true
  }, [step, apkFile, name, tagline, description, category, packageName, hasInAppPayment, netboxPaymentIntegrated, developedForAndroidTv, airMouseCompatible, iconFile, bannerFile])

  useEffect(() => {
    if (authReady && !user) router.replace('/login?next=/upload')
  }, [authReady, user, router])

  if (!authReady) {
    return <main className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بررسی حساب...</span></main>
  }
  if (!user) return null

  const readImage = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader()
    reader.onload = () => callback(String(reader.result))
    reader.readAsDataURL(file)
  }
  const uploadFile = async (file: File, label: string) => {
    if (!user?.id) throw new Error('auth_required')

    const isApk = file.name.toLowerCase().endsWith('.apk')
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(-120)
    const pathname = `users/${user.id}/${crypto.randomUUID()}-${safeName}`
    const contentType = isApk ? 'application/vnd.android.package-archive' : file.type

    try {
      const blob = await upload(pathname, file, {
        access: 'private',
        handleUploadUrl: '/api/blob-upload',
        contentType,
        multipart: isApk && file.size > 10 * 1024 * 1024,
      })

      return {
        pathname: blob.pathname,
        name: file.name,
        size: file.size,
        contentType,
      }
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown_upload_error'
      throw new Error(`upload_failed:${label}:${detail}`)
    }
  }
  const onApk = (file?: File) => {
    if (!file) return
    setErrorMessage('')
    if (!file.name.toLowerCase().endsWith('.apk')) {
      setApkFile(null)
      setApkName('')
      setApkSize('')
      setErrorMessage('فایل انتخاب‌شده باید با فرمت APK باشد.')
      return
    }
    if (file.size > 250 * 1024 * 1024) {
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
  const submitForReview = async () => {
    if (!apkFile || !iconFile || !bannerFile) {
      setErrorMessage('فایل APK، آیکون و بنر باید انتخاب شده باشند.')
      return
    }

    setSaving(true)
    setErrorMessage('')

    try {
      const apk = await uploadFile(apkFile, 'APK')
      const iconUpload = await uploadFile(iconFile, 'آیکون')
      const bannerUpload = await uploadFile(bannerFile, 'بنر')
      const shotUploads = await Promise.all(
        screenshotFiles.map((file, index) => uploadFile(file, `اسکرین‌شات ${index + 1}`)),
      )

      const response = await fetch('/api/apps/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          tagline,
          description,
          hasInAppPayment,
          netboxPaymentIntegrated,
          developedForAndroidTv,
          airMouseCompatible,
          category,
          ageRestriction,
          packageName: packageName.trim(),
          website,
          supportEmail: email,
          apk,
          icon: iconUpload,
          banner: bannerUpload,
          screenshots: shotUploads,
        }),
      })

      const result = await response.json().catch(() => null)

      if (!response.ok) {
        if (response.status === 401) throw new Error('auth_required')
        throw new Error(result?.error || 'submit_failed')
      }

      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      const code = error instanceof Error ? error.message : 'submit_failed'
      const uploadFailure = code.startsWith('upload_failed:')
      const uploadParts = uploadFailure ? code.split(':') : []
      setErrorMessage(
        uploadFailure
          ? `آپلود ${uploadParts[1] || 'فایل'} انجام نشد. ${uploadParts.slice(2).join(':') || 'دوباره تلاش کنید.'}`
          : code === 'auth_required'
          ? 'نشست ورود شما منقضی شده است. دوباره وارد شوید و ارسال را تکرار کنید.'
          : code === 'payment_required'
            ? 'این اپ پرداخت درون‌برنامه‌ای دارد و باید Netbox Payment را پیاده‌سازی کند.'
            : code === 'tv_compatibility_required'
              ? 'اپی که مخصوص Android TV توسعه داده نشده فقط در صورتی قابل بررسی است که با ایرماوس یا ماوس به‌راحتی قابل استفاده باشد.'
              : code === 'database_insert_failed'
                ? 'فایل‌ها آپلود شدند، اما ثبت اپ در دیتابیس انجام نشد. دوباره تلاش کنید.'
                : code === 'submission_snapshot_failed'
                  ? 'اپ ثبت شد، اما ایجاد درخواست بررسی انجام نشد. لطفاً با پشتیبانی تماس بگیرید.'
                  : `ارسال اپ کامل نشد. کد خطا: ${code}`,
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Rocket className="size-5" /></span>
        <div><h1 className="text-2xl font-bold">انتشار اپلیکیشن در نت‌استور</h1><p className="text-sm text-muted-foreground">گام {toFa(step)} از {toFa(steps.length)} — {steps[step - 1]}</p></div>
      </div>
      <div className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4">
        {steps.map((title, i) => <button key={title} type="button" onClick={() => i + 1 < step && setStep(i + 1)} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${step === i + 1 ? 'bg-primary text-primary-foreground' : step > i + 1 ? 'bg-accent/15 text-accent-foreground' : 'text-muted-foreground'}`}><span className="flex size-6 items-center justify-center rounded-full border border-current text-xs">{step > i + 1 ? <Check className="size-3" /> : toFa(i + 1)}</span>{title}</button>)}
      </div>
      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        {step === 1 && <div><Header title="آپلود فایل APK" text="فایل نصب اپلیکیشن اندروید تی‌وی را بارگذاری کنید." /><Dropzone accept=".apk" label="فایل APK را انتخاب کنید" onChange={(f) => onApk(f)} /><p className="mt-3 text-xs text-muted-foreground">{apkName ? `${apkName} — ${apkSize}` : 'فرمت مجاز: .apk'}</p></div>}
        {step === 2 && <div><Header title="اطلاعات پایه" text="اطلاعات اصلی اپلیکیشن را وارد کنید." /><div className="flex flex-col gap-4"><Field label="عنوان اپلیکیشن" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="توضیح کوتاه" required><Input value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field><Field label="توضیحات کامل" required><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} /></Field><Field label="پکیج‌نیم (شناسه اپ در اندروید)" required><Input value={packageName} onChange={(e) => setPackageName(e.target.value.trim())} dir="ltr" placeholder="com.company.app" /><p className="text-xs leading-6 text-muted-foreground">این شناسه باید با پکیج‌نیم داخل APK یکی باشد؛ استخراج خودکار را در مرحله بعد اضافه می‌کنیم.</p></Field><Field label="دسته‌بندی" required><Select value={category} onValueChange={(v) => setCategory(v as AppCategory)}><SelectTrigger><SelectValue placeholder="انتخاب دسته‌بندی" /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="محدودیت سنی" required><Select value={ageRestriction} onValueChange={(v) => setAgeRestriction(v as typeof ageRestriction)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['همه سنین', '+۷', '+۱۲', '+۱۵', '+۱۸'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field></div></div>}
        {step === 3 && (
          <div>
            <Header title="شرایط انتشار" text="دو سؤال زیر مشخص می‌کنند اپ شما با الزامات نت‌استور سازگار است یا نه." />
            <div className="mt-6 flex flex-col gap-6">
              <div className="rounded-2xl border border-border p-5">
                <p className="font-semibold">آیا اپلیکیشن شما پرداخت یا خرید درون‌برنامه‌ای دارد؟</p>
                <div className="mt-4 flex gap-2">
                  <Button type="button" variant={hasInAppPayment === true ? 'default' : 'outline'} onClick={() => { setHasInAppPayment(true); setNetboxPaymentIntegrated(false) }}>بله</Button>
                  <Button type="button" variant={hasInAppPayment === false ? 'default' : 'outline'} onClick={() => { setHasInAppPayment(false); setNetboxPaymentIntegrated(false) }}>خیر</Button>
                </div>
                {hasInAppPayment && (
                  <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">
                    <input type="checkbox" checked={netboxPaymentIntegrated} onChange={(e) => setNetboxPaymentIntegrated(e.target.checked)} className="mt-1 size-4" />
                    <span>تأیید می‌کنم که برای پرداخت‌های دیجیتال این نسخه، <strong>Netbox Payment</strong> پیاده‌سازی شده است. بدون این اتصال، اپ برای انتشار تأیید نمی‌شود.</span>
                  </label>
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
        {step === 4 && <div><Header title="اطلاعات نمایشی" text="این اطلاعات در صفحه معرفی اپ نمایش داده می‌شوند." /><div className="flex flex-col gap-4"><Field label="آدرس وبسایت"><Input value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" type="url" placeholder="https://example.com" /></Field><Field label="ایمیل پشتیبانی"><Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" type="email" placeholder="support@example.com" /></Field></div></div>}
        {step === 5 && <div><Header title="تصاویر و رسانه" text="آیکون، بنر و تصاویر اپلیکیشن را اضافه کنید." /><div className="grid gap-6 sm:grid-cols-2"><MediaField title="آیکون اپلیکیشن (نسبت ۱:۱)" required value={icon} onFile={(f) => { setIconFile(f); readImage(f, setIcon) }} onClear={() => { setIcon(''); setIconFile(null) }} square /><MediaField title="بنر معرفی (نسبت ۱۶:۹)" required value={banner} onFile={(f) => { setBannerFile(f); readImage(f, setBanner) }} onClear={() => { setBanner(''); setBannerFile(null) }} /><div className="sm:col-span-2"><Label>تصاویر محیط اپ <span className="text-muted-foreground">(اختیاری)</span></Label><Dropzone accept="image/*" label="افزودن تصاویر" multiple onChange={(f) => { setScreenshotFiles((old) => [...old, f].slice(0, 6)); readImage(f, (url) => setScreenshots((old) => [...old, url].slice(0, 6))) }} /><div className="mt-3 flex flex-wrap gap-3">{screenshots.map((src, i) => <div key={src} className="relative"><img src={src} alt={`تصویر ${i + 1}`} className="size-20 rounded-lg object-cover" /><button type="button" aria-label="حذف تصویر" onClick={() => { setScreenshots((old) => old.filter((_, n) => n !== i)); setScreenshotFiles((old) => old.filter((_, n) => n !== i)) }} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="size-3" /></button></div>)}</div></div></div></div>}
        {step === 6 && <div><Header title="بازبینی اطلاعات" text="اطلاعات را بررسی کنید و اپلیکیشن را برای بررسی کارشناسان ارسال کنید." /><div className="grid gap-3 text-sm">{[['فایل APK', apkName], ['عنوان', name], ['پکیج‌نیم', packageName], ['دسته‌بندی', category], ['محدودیت سنی', ageRestriction], ['پرداخت درون‌برنامه‌ای', hasInAppPayment ? 'دارد — Netbox Payment تأیید شده' : 'ندارد'], ['نسخه مخصوص Android TV', developedForAndroidTv ? 'بله' : 'خیر — قابل استفاده با ایرماوس/ماوس'], ['وبسایت', website || '—'], ['ایمیل پشتیبانی', email || '—'], ['تصاویر', `${toFa(screenshots.length)} تصویر`]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 rounded-xl bg-secondary/60 p-4"><span className="text-muted-foreground">{label}</span><span className="font-medium" dir="ltr">{value}</span></div>)}</div><div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">پس از ارسال، اطلاعات شما توسط کارشناس نت‌استور بررسی می‌شود و بعد از تأیید، اپلیکیشن در فروشگاه منتشر خواهد شد.</div></div>}
      </section>
      <div className="mt-6 flex justify-between"><Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="gap-2"><ArrowRight className="size-4" />قبلی</Button>{step < 6 ? <Button onClick={() => valid && setStep((s) => s + 1)} disabled={!valid} className="gap-2">گام بعدی<ArrowLeft className="size-4" /></Button> : <Button onClick={submitForReview} disabled={saving} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}ارسال برای بررسی</Button>}</div>
      {errorMessage && <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">{errorMessage}</p>}
      {!valid && step < 5 && <p className="mt-3 text-center text-xs text-muted-foreground">فیلدهای الزامی را کامل کنید.</p>}
    </main>
  )
}

function Header({ title, text }: { title: string; text: string }) { return <div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div> }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="mt-5 flex flex-col gap-2"><Label>{label} {required && <span className="text-destructive">*</span>}</Label>{children}</div> }
function Dropzone({ accept, label, onChange, multiple }: { accept: string; label: string; onChange: (file: File) => void; multiple?: boolean }) { return <Label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center hover:border-primary/50"><UploadCloud className="size-8 text-primary" /><span className="text-sm font-medium">{label}</span><input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => Array.from(e.target.files || []).forEach(onChange)} /></Label> }
function MediaField({ title, required, value, onFile, onClear, square }: { title: string; required?: boolean; value: string; onFile: (file: File) => void; onClear: () => void; square?: boolean }) { return <div><Label>{title} {required && <span className="text-destructive">*</span>}</Label>{value ? <div className="relative mt-3"><img src={value} alt={`پیش‌نمایش ${title}`} className={`w-full rounded-xl border object-cover ${square ? 'aspect-square max-w-40' : 'aspect-video'}`} /><button type="button" aria-label={`حذف ${title}`} onClick={onClear} className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground"><X className="size-3" /></button></div> : <Dropzone accept="image/*" label="افزودن تصویر" onChange={onFile} />}</div> }

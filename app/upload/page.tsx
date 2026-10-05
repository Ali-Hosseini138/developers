'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Check, FileArchive, ImagePlus, Loader2, Rocket, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStore } from '@/components/store-provider'
import { CATEGORIES, type AppCategory } from '@/lib/types'
import { toFa } from '@/lib/format'

const steps = ['فایل APK', 'اطلاعات پایه', 'اطلاعات نمایشی', 'رسانه', 'بازبینی']

export default function UploadPage() {
  const { user, addApp } = useStore()
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [apkName, setApkName] = useState('')
  const [apkSize, setApkSize] = useState('')
  const [name, setName] = useState('')
  const [tagline, setTagline] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<AppCategory | ''>('')
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

  const valid = useMemo(() => {
    if (step === 1) return Boolean(apkName)
    if (step === 2) return Boolean(name && tagline && description && category)
    if (step === 4) return Boolean(icon && banner)
    return true
  }, [step, apkName, name, tagline, description, category, icon, banner])

  if (!user) return null

  const readImage = (file: File, callback: (url: string) => void) => {
    const reader = new FileReader()
    reader.onload = () => callback(String(reader.result))
    reader.readAsDataURL(file)
  }
  const uploadFile = async (file: File) => {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch('/api/blob-upload', { method: 'POST', body })
    if (!response.ok) throw new Error('upload_failed')
    return response.json() as Promise<{ pathname: string; name: string; size: number; contentType: string }>
  }
  const onApk = (file?: File) => {
    if (!file) return
    setApkFile(file)
    setApkName(file.name)
    setApkSize(`${toFa((file.size / 1024 / 1024).toFixed(1))} مگابایت`)
  }
  const publishDraft = async () => {
    if (!apkFile || !iconFile || !bannerFile) return
    setSaving(true)
    try {
      const [apk, iconUpload, bannerUpload, ...shotUploads] = await Promise.all([apkFile, iconFile, bannerFile, ...screenshotFiles].map(uploadFile))
      await addApp({ id: `${name.trim().replace(/\s+/g, '-')}-${Date.now()}`, name, tagline, description, category: category as AppCategory, icon, banner, screenshots, developer: user.name, version: '', price: 0, rating: 0, downloads: 0, platforms: [], tags: [], updatedAt: 'پیش‌نویس', reviews: [], website: website || undefined, supportEmail: email || undefined, apkName: apk.name, apkSize: `${toFa((apk.size / 1024 / 1024).toFixed(1))} مگابایت`, apkPath: apk.pathname, iconPath: iconUpload.pathname, bannerPath: bannerUpload.pathname, screenshotPaths: shotUploads.map((item) => item.pathname), ageRestriction })
      router.push('/dashboard')
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
        {step === 2 && <div><Header title="اطلاعات پایه" text="اطلاعات اصلی اپلیکیشن را وارد کنید." /><div className="flex flex-col gap-4"><Field label="عنوان اپلیکیشن" required><Input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="توضیح کوتاه" required><Input value={tagline} onChange={(e) => setTagline(e.target.value)} /></Field><Field label="توضیحات کامل" required><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} /></Field><Field label="دسته‌بندی" required><Select value={category} onValueChange={(v) => setCategory(v as AppCategory)}><SelectTrigger><SelectValue placeholder="انتخاب دسته‌بندی" /></SelectTrigger><SelectContent>{CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field><Field label="محدودیت سنی" required><Select value={ageRestriction} onValueChange={(v) => setAgeRestriction(v as typeof ageRestriction)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['همه سنین', '+۷', '+۱۲', '+۱۵', '+۱۸'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></Field></div></div>}
        {step === 3 && <div><Header title="اطلاعات نمایشی" text="این اطلاعات در صفحه معرفی اپ نمایش داده می‌شوند." /><div className="flex flex-col gap-4"><Field label="آدرس وبسایت"><Input value={website} onChange={(e) => setWebsite(e.target.value)} dir="ltr" placeholder="https://example.com" /></Field><Field label="ایمیل پشتیبانی"><Input value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" type="email" placeholder="support@example.com" /></Field><div className="rounded-xl bg-secondary/60 p-4 text-sm text-muted-foreground">بنر معرفی اپ در گام بعدی الزامی است.</div></div></div>}
        {step === 4 && <div><Header title="تصاویر و رسانه" text="آیکون، بنر و تصاویر اپلیکیشن را اضافه کنید." /><div className="grid gap-6 sm:grid-cols-2"><MediaField title="آیکون اپلیکیشن (نسبت ۱:۱)" required value={icon} onFile={(f) => { setIconFile(f); readImage(f, setIcon) }} onClear={() => { setIcon(''); setIconFile(null) }} square /><MediaField title="بنر معرفی (نسبت ۱۶:۹)" required value={banner} onFile={(f) => { setBannerFile(f); readImage(f, setBanner) }} onClear={() => { setBanner(''); setBannerFile(null) }} /><div className="sm:col-span-2"><Label>تصاویر محیط اپ <span className="text-muted-foreground">(اختیاری)</span></Label><Dropzone accept="image/*" label="افزودن تصاویر" multiple onChange={(f) => { setScreenshotFiles((old) => [...old, f].slice(0, 6)); readImage(f, (url) => setScreenshots((old) => [...old, url].slice(0, 6))) }} /><div className="mt-3 flex flex-wrap gap-3">{screenshots.map((src, i) => <div key={src} className="relative"><img src={src} alt={`تصویر ${i + 1}`} className="size-20 rounded-lg object-cover" /><button type="button" onClick={() => setScreenshots((old) => old.filter((_, n) => n !== i))} className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground"><X className="size-3" /></button></div>)}</div></div></div></div>}
        {step === 5 && <div><Header title="بازبینی اطلاعا��" text="اطلاعات را بررسی کنید و پیش‌نویس را برای بررسی کارشناسان ارسال کنید." /><div className="grid gap-3 text-sm">{[['فایل APK', apkName], ['عنوان', name], ['دسته‌بندی', category], ['محدودیت سنی', ageRestriction], ['وبسایت', website || '—'], ['ایمیل پشتیبانی', email || '—'], ['تصاویر', `${toFa(screenshots.length)} تصویر`]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 rounded-xl bg-secondary/60 p-4"><span className="text-muted-foreground">{label}</span><span className="font-medium" dir="ltr">{value}</span></div>)}</div><div className="mt-5 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-7">پس از انتشار پیش‌نویس، اطلاعات شما توسط کارشناس نت‌استور بررسی می‌شود و بعد از تأیید، اپلیکیشن در فروشگاه منتشر خواهد شد.</div></div>}
      </section>
      <div className="mt-6 flex justify-between"><Button variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1} className="gap-2"><ArrowRight className="size-4" />قبلی</Button>{step < 5 ? <Button onClick={() => valid && setStep((s) => s + 1)} disabled={!valid} className="gap-2">گام بعدی<ArrowLeft className="size-4" /></Button> : <Button onClick={publishDraft} disabled={saving} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />}انتشار پیش‌نویس</Button>}</div>
      {!valid && step < 5 && <p className="mt-3 text-center text-xs text-muted-foreground">فیلدهای الزامی را کامل کنید.</p>}
    </main>
  )
}

function Header({ title, text }: { title: string; text: string }) { return <div><h2 className="text-xl font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{text}</p></div> }
function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <div className="mt-5 flex flex-col gap-2"><Label>{label} {required && <span className="text-destructive">*</span>}</Label>{children}</div> }
function Dropzone({ accept, label, onChange, multiple }: { accept: string; label: string; onChange: (file: File) => void; multiple?: boolean }) { return <Label className="mt-5 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border bg-secondary/40 p-10 text-center hover:border-primary/50"><UploadCloud className="size-8 text-primary" /><span className="text-sm font-medium">{label}</span><input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])} /></Label> }
function MediaField({ title, required, value, onFile, onClear, square }: { title: string; required?: boolean; value: string; onFile: (file: File) => void; onClear: () => void; square?: boolean }) { return <div><Label>{title} {required && <span className="text-destructive">*</span>}</Label>{value ? <div className="relative mt-3"><img src={value} alt={`پیش‌نمایش ${title}`} className={`w-full rounded-xl border object-cover ${square ? 'aspect-square max-w-40' : 'aspect-video'}`} /><button type="button" onClick={onClear} className="absolute right-2 top-2 rounded-full bg-destructive p-1.5 text-destructive-foreground"><X className="size-3" /></button></div> : <Dropzone accept="image/*" label="افزودن تصویر" onChange={onFile} />}</div> }

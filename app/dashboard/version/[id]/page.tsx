'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowRight, Check, FileArchive, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/components/store-provider'

export default function NewVersionPage() {
  const { id } = useParams<{ id: string }>()
  const { user, getApp, addVersion } = useStore()
  const router = useRouter()
  const app = getApp(id)
  const [changes, setChanges] = useState('')
  const [apkName, setApkName] = useState('')
  const [packageName, setPackageName] = useState(app?.packageName || '')
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (!user) router.replace('/login?next=/dashboard') }, [user, router])
  if (!user || !app) return null
  const currentApp = app
  async function submit(e: React.FormEvent) { e.preventDefault(); if (!apkName || !changes) return; await addVersion(currentApp.id, apkName, packageName, changes); setSaved(true); setTimeout(() => router.push('/dashboard'), 900) }
  return <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6"><Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="size-4" />بازگشت به داشبورد</Link><div className="mt-8"><p className="text-sm font-semibold text-primary">انتشار نسخه جدید</p><h1 className="mt-2 text-3xl font-bold">نسخه جدید {app.name}</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">شماره نسخه از فایل APK خوانده می‌شود و نسخه پس از بررسی کارشناس منتشر خواهد شد.</p></div><form onSubmit={submit} className="mt-8 flex flex-col gap-5 rounded-2xl border border-border bg-card p-6"><div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-6 text-center"><UploadCloud className="mx-auto size-8 text-primary" /><p className="mt-3 font-medium">فایل APK نسخه جدید</p><Input id="new-apk" type="file" accept=".apk" className="mt-4" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setApkName(file.name); const inferred = file.name.replace(/\.apk$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '.'); setPackageName(inferred ? `ir.netstore.${inferred}` : app.packageName || 'ir.netstore.app') }} required /><p className="mt-2 text-xs text-muted-foreground">فقط فایل APK سازگار با Android TV</p></div><div><Label htmlFor="package">پکیج‌نیم استخراج‌شده</Label><Input id="package" value={packageName} onChange={(e) => setPackageName(e.target.value)} dir="ltr" className="mt-1.5" required /></div><div><Label htmlFor="changes">تغییرات نسخه</Label><Textarea id="changes" value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="ویژگی‌های جدید، رفع مشکلات و تغییرات این نسخه را بنویسید..." className="mt-1.5 min-h-40" required /></div><div className="flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-sm leading-7 text-muted-foreground"><FileArchive className="mt-1 size-4 shrink-0 text-primary" />بعد از ارسال، نسخه در وضعیت پیش‌نویس قرار می‌گیرد و پس از تأیید کارشناس نت‌استور برای کاربران قابل دریافت خواهد بود.</div><Button type="submit" className="gap-2">{saved ? <Check className="size-4" /> : <UploadCloud className="size-4" />}{saved ? 'پیش‌نویس ثبت شد' : 'ثبت پیش‌نویس نسخه'}</Button></form></main>
}

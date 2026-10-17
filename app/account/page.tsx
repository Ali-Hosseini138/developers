'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { asciiDigits } from '@/lib/input-normalization'
import { LoadFailure } from '@/components/load-failure'
import { useStore } from '@/components/store-provider'

export default function AccountPage() {
  const { user, authReady, sessionError, updateProfile } = useStore()
  const router = useRouter()
  const accountType = user?.accountType || 'individual'
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [organization, setOrganization] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (authReady && !sessionError && !user) router.replace('/login?next=/account')
    else if (user) {
      setFirstName(user.firstName || '')
      setLastName(user.lastName || '')
      setPhone(user.phone || '')
      setNationalId(user.nationalId || '')
      setOrganization(user.organization || '')
    }
  }, [authReady, sessionError, user, router])

  if (!authReady) return <main className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4 py-10"><span className="text-sm text-muted-foreground">در حال بارگذاری حساب...</span></main>
  if (sessionError) return <LoadFailure message={sessionError} />
  if (!user) return null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setSaved(false)
    setErrorMessage('')
    try {
      await updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), phone: asciiDigits(phone.trim()), nationalId: asciiDigits(nationalId.trim()), organization: accountType === 'legal' ? organization.trim() : '' })
      setSaved(true)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'ذخیره اطلاعات انجام نشد. دوباره تلاش کنید.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-5" /></span>
          <div><h1 className="text-2xl font-bold">اطلاعات کاربری</h1><p className="mt-1 text-sm text-muted-foreground">اطلاعات حساب توسعه‌دهنده شما</p></div>
        </div>
        <fieldset disabled={saving} className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2"><Label htmlFor="account-type">نوع حساب</Label><Input id="account-type" value={accountType === 'legal' ? 'حقوقی' : 'حقیقی'} readOnly aria-describedby="account-type-help" className="mt-1.5 bg-secondary/50" /><p id="account-type-help" className="mt-2 text-xs text-muted-foreground">نوع حساب پس از ثبت‌نام قابل تغییر نیست.</p></div>
          <div><Label htmlFor="account-first-name">نام</Label><Input id="account-first-name" value={firstName} onChange={e => { setFirstName(e.target.value); setSaved(false) }} className="mt-1.5" required /></div>
          <div><Label htmlFor="account-last-name">نام خانوادگی</Label><Input id="account-last-name" value={lastName} onChange={e => { setLastName(e.target.value); setSaved(false) }} className="mt-1.5" required /></div>
          <div><Label htmlFor="account-email">ایمیل</Label><Input id="account-email" value={user.email} readOnly dir="ltr" className="mt-1.5 bg-secondary/50" /></div>
          <div><Label htmlFor="account-phone">شماره تلفن</Label><Input id="account-phone" value={phone} onChange={(e) => { setPhone(e.target.value); setSaved(false) }} dir="ltr" inputMode="tel" className="mt-1.5" /></div>
          <div><Label htmlFor="account-national-id">{accountType === 'legal' ? 'شناسه ملی شرکت (۱۱ رقم)' : 'کد ملی (۱۰ رقم)'}</Label><Input id="account-national-id" value={nationalId} onChange={(e) => { setNationalId(e.target.value); setSaved(false) }} dir="ltr" inputMode="numeric" pattern={accountType === 'legal' ? '[0-9۰-۹٠-٩]{11}' : '[0-9۰-۹٠-٩]{10}'} required className="mt-1.5" /></div>
          {accountType === 'legal' && <div className="sm:col-span-2"><Label htmlFor="account-organization">نام سازمان</Label><Input id="account-organization" value={organization} onChange={(e) => { setOrganization(e.target.value); setSaved(false) }} required className="mt-1.5" /></div>}
        </fieldset>
        {errorMessage && <p role="alert" className="mt-6 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorMessage}</p>}
        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}ذخیره اطلاعات</Button>
          {saved && <span className="text-sm text-accent-foreground">اطلاعات ذخیره شد.</span>}
        </div>
      </form>
    </main>
  )
}

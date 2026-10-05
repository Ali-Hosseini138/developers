'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStore } from '@/components/store-provider'

export default function AccountPage() {
  const { user, updateProfile } = useStore()
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [nationalId, setNationalId] = useState('')
  const [organization, setOrganization] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) router.replace('/login?next=/account')
    else {
      setName(user.name)
      setPhone(user.phone || '')
      setNationalId(user.nationalId || '')
      setOrganization(user.organization || '')
    }
  }, [user, router])

  if (!user) return null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    await updateProfile({ name: name.trim(), phone: phone.trim(), nationalId: nationalId.trim(), organization: organization.trim() })
    setSaving(false)
    setSaved(true)
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <form onSubmit={save} className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><UserRound className="size-5" /></span>
          <div><h1 className="text-2xl font-bold">اطلاعات کاربری</h1><p className="mt-1 text-sm text-muted-foreground">اطلاعات حساب توسعه‌دهنده شما</p></div>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div><Label htmlFor="account-name">نام یا سازمان</Label><Input id="account-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1.5" /></div>
          <div><Label htmlFor="account-email">ایمیل</Label><Input id="account-email" value={user.email} readOnly dir="ltr" className="mt-1.5 bg-secondary/50" /></div>
          <div><Label htmlFor="account-phone">شماره تلفن</Label><Input id="account-phone" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="mt-1.5" /></div>
          <div><Label htmlFor="account-national-id">کد ملی</Label><Input id="account-national-id" value={nationalId} onChange={(e) => setNationalId(e.target.value)} className="mt-1.5" /></div>
          <div className="sm:col-span-2"><Label htmlFor="account-organization">نام سازمان</Label><Input id="account-organization" value={organization} onChange={(e) => setOrganization(e.target.value)} className="mt-1.5" /></div>
        </div>
        <div className="mt-6 flex items-center gap-3">
          <Button type="submit" disabled={saving} className="gap-2">{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}ذخیره اطلاعات</Button>
          {saved && <span className="text-sm text-accent-foreground">اطلاعات ذخیره شد.</span>}
        </div>
      </form>
    </main>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Category = { id: number; name: string; parentId: number | null }

export function DeveloperCategorySelect({ value, onChange }: { value: string; onChange: (value: string, categoryName: string) => void }) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    void fetch('/api/developer-hub/config', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(response.status === 401 ? 'نشست ورود منقضی شده است؛ دوباره وارد شوید.' : 'دریافت دسته‌بندی‌ها انجام نشد.')
        if (!Array.isArray(payload?.categories)) throw new Error('پاسخ دسته‌بندی‌ها معتبر نیست.')
        if (!controller.signal.aborted) setCategories(payload.categories)
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'دریافت دسته‌بندی‌ها انجام نشد.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])

  return <>
    <Select value={value} onValueChange={(next) => {
      const category = categories.find((item) => String(item.id) === next)
      if (category) onChange(String(category.id), category.name)
    }} disabled={loading || Boolean(error) || categories.length === 0}>
      <SelectTrigger><SelectValue>{loading ? 'در حال دریافت دسته‌بندی‌ها...' : categories.find(category => String(category.id) === value)?.name || 'انتخاب دسته‌بندی'}</SelectValue></SelectTrigger>
      <SelectContent>{categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}</SelectContent>
    </Select>
    {!loading && (error || categories.length === 0) && <div className="flex items-center gap-2 text-xs text-destructive" role="alert">
      <span>{error || 'دسته‌بندی‌ای در دسترس نیست.'}</span>
      <Button type="button" variant="link" size="sm" onClick={() => setAttempt((current) => current + 1)}>تلاش دوباره</Button>
    </div>}
  </>
}

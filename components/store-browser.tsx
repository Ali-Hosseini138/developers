'use client'

import { useMemo, useState } from 'react'
import { Search, SlidersHorizontal, PackageOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AppCard } from '@/components/app-card'
import { useStore } from '@/components/store-provider'
import { CATEGORIES } from '@/lib/types'
import { cn } from '@/lib/utils'

type SortKey = 'downloads' | 'rating' | 'newest'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'downloads', label: 'محبوب‌ترین' },
  { key: 'rating', label: 'بیشترین امتیاز' },
  { key: 'newest', label: 'جدیدترین' },
]

export function StoreBrowser() {
  const { apps } = useStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('downloads')

  const filtered = useMemo(() => {
    let list = apps.filter((app) => {
      const matchesQuery =
        query.trim() === '' ||
        app.name.includes(query) ||
        app.tagline.includes(query) ||
        app.tags.some((t) => t.includes(query))
      const matchesCategory = !category || app.category === category
      return matchesQuery && matchesCategory
    })

    list = [...list].sort((a, b) => {
      if (sort === 'downloads') return b.downloads - a.downloads
      if (sort === 'rating') return b.rating - a.rating
      return 0
    })
    return list
  }, [apps, query, category, sort])

  return (
    <section id="browse" className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">مرور اپلیکیشن‌ها</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              میان همه ابزارها بگرد یا بر اساس دسته‌بندی فیلتر کن
            </p>
          </div>
          <div className="relative w-full lg:w-80">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجوی اپ، برچسب یا توضیحات..."
              className="pe-9"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 border-y border-border py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setCategory(null)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition-colors',
                !category
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground',
              )}
            >
              همه
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm transition-colors',
                  category === cat
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground',
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="size-4 text-muted-foreground" />
            {SORT_OPTIONS.map((opt) => (
              <Button
                key={opt.key}
                size="sm"
                variant={sort === opt.key ? 'secondary' : 'ghost'}
                onClick={() => setSort(opt.key)}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
            <PackageOpen className="size-10 text-muted-foreground" />
            <p className="font-medium">اپی پیدا نشد</p>
            <p className="text-sm text-muted-foreground">
              فیلترها یا عبارت جستجو را تغییر بده
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

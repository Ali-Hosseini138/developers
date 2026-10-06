'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Download } from 'lucide-react'
import { StarRating } from '@/components/star-rating'
import { useStore } from '@/components/store-provider'
import { formatDownloads } from '@/lib/format'

export function FeaturedApps() {
  const { apps } = useStore()
  const featured = apps.filter((a) => a.featured && (!a.status || a.status === 'published')).slice(0, 3)

  if (featured.length === 0) return null

  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
      <h2 className="text-2xl font-bold tracking-tight">اپ‌های منتخب</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        برگزیده‌های سردبیر از میان بهترین ابزارها
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {featured.map((app) => (
          <Link
            key={app.id}
            href={`/app/${app.id}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="flex items-center gap-4 bg-gradient-to-l from-primary/10 to-transparent p-5">
              <Image
                src={app.icon || '/placeholder.svg'}
                alt={`آیکون ${app.name}`}
                width={64}
                height={64}
                className="size-16 rounded-2xl border border-border object-cover"
              />
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold">{app.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {app.developer}
                </span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5 pt-0">
              <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {app.tagline}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <StarRating rating={app.rating} />
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Download className="size-3.5" />
                  {formatDownloads(app.downloads)}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">{app.category}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

import Link from 'next/link'
import Image from 'next/image'
import { Download } from 'lucide-react'
import { StarRating } from '@/components/star-rating'
import { formatDownloads } from '@/lib/format'
import type { StoreApp } from '@/lib/types'

export function AppCard({ app }: { app: StoreApp }) {
  return (
    <Link
      href={`/app/${app.id}`}
      className="group flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
    >
      <div className="flex items-start gap-3">
        <Image
          src={app.icon || '/placeholder.svg'}
          alt={`آیکون ${app.name}`}
          width={56}
          height={56}
          className="size-14 shrink-0 rounded-xl border border-border object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold">{app.name}</h3>

          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {app.tagline}
          </p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
        <StarRating rating={app.rating} />
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Download className="size-3.5" />
          {formatDownloads(app.downloads)}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{app.category}</span>
      </div>
    </Link>
  )
}

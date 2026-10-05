'use client'

import { use } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  Calendar,
  Check,
  Download,
  Globe,
  Mail,
  Monitor,
  Package,
  PlayCircle,
  Share2,
  Tag,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StarRating } from '@/components/star-rating'
import { AppCard } from '@/components/app-card'
import { useStore } from '@/components/store-provider'
import { formatDownloads, formatPrice, toFa } from '@/lib/format'

export default function AppDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { getApp, apps } = useStore()
  const app = getApp(id)

  if (!app) notFound()

  const related = apps
    .filter((a) => a.category === app.category && a.id !== app.id)
    .slice(0, 4)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowRight className="size-4" />
        بازگشت به فروشگاه
      </Link>

      {app.banner && (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border">
          <Image
            src={app.banner || '/placeholder.svg'}
            alt={`بنر ${app.name}`}
            width={1200}
            height={360}
            className="h-40 w-full object-cover sm:h-56"
          />
        </div>
      )}

      {/* Hero */}
      <div className="mt-6 flex flex-col gap-6 rounded-2xl border border-border bg-card p-6 sm:flex-row sm:items-start">
        <Image
          src={app.icon || '/placeholder.svg'}
          alt={`آیکون ${app.name}`}
          width={112}
          height={112}
          className="size-24 shrink-0 rounded-3xl border border-border object-cover sm:size-28"
        />

        <div className="flex-1">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  {app.name}
                </h1>
                {app.price === 0 && (
                  <Badge className="bg-accent/15 text-accent-foreground">
                    رایگان
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-muted-foreground">{app.tagline}</p>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                ساخته‌شده توسط
                <span className="font-medium text-foreground">
                  {app.developer}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-6">
            <div className="flex flex-col">
              <StarRating rating={app.rating} size={16} />
              <span className="mt-1 text-xs text-muted-foreground">
                {toFa(app.reviews.length)} دیدگاه
              </span>
            </div>
            <Separator orientation="vertical" className="h-10" />
            <MetaItem
              icon={<Download className="size-4" />}
              value={formatDownloads(app.downloads)}
              label="دانلود"
            />
            <Separator orientation="vertical" className="h-10" />
            <MetaItem
              icon={<Package className="size-4" />}
              value={app.version}
              label="نسخه"
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button size="lg" className="gap-2">
              <Download className="size-4" />
              {app.price === 0 ? 'دانلود رایگان' : `خرید — ${formatPrice(app.price)}`}
            </Button>
            <Button size="lg" variant="outline" className="gap-2">
              <Share2 className="size-4" />
              اشتراک‌گذاری
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main column */}
        <div className="lg:col-span-2">
          {app.screenshots.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-bold">تصاویر</h2>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {app.screenshots.map((shot, i) => (
                  <Image
                    key={i}
                    src={shot || '/placeholder.svg'}
                    alt={`تصویر ${toFa(i + 1)} از ${app.name}`}
                    width={640}
                    height={400}
                    className="h-56 w-auto shrink-0 rounded-xl border border-border object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          {app.videoUrl && (
            <section className="mb-8">
              <h2 className="mb-4 text-lg font-bold">ویدیوی معرفی</h2>
              <a
                href={app.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PlayCircle className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">مشاهده ویدیوی معرفی اپ</p>
                  <p className="truncate text-xs text-muted-foreground" dir="ltr">
                    {app.videoUrl}
                  </p>
                </div>
              </a>
            </section>
          )}

          <section className="mb-8">
            <h2 className="mb-3 text-lg font-bold">درباره این اپ</h2>
            <p className="whitespace-pre-line text-pretty leading-loose text-muted-foreground">
              {app.description}
            </p>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-bold">
              دیدگاه‌ها ({toFa(app.reviews.length)})
            </h2>
            {app.reviews.length > 0 ? (
              <div className="flex flex-col gap-4">
                {app.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-xl border border-border bg-card p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarFallback className="bg-secondary text-xs font-semibold">
                            {review.author.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {review.author}
                        </span>
                      </div>
                      <StarRating rating={review.rating} showValue={false} />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {review.comment}
                    </p>
                    <span className="mt-2 block text-xs text-muted-foreground">
                      {review.date}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                هنوز دیدگاهی ثبت نشده است.
              </p>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold">اطلاعات</h3>
            <dl className="mt-4 flex flex-col gap-4 text-sm">
              <InfoRow
                icon={<Tag className="size-4" />}
                label="دسته‌بندی"
                value={app.category}
              />
              <InfoRow
                icon={<Package className="size-4" />}
                label="نسخه"
                value={app.version}
              />
              <InfoRow
                icon={<Calendar className="size-4" />}
                label="آخرین بروزرسانی"
                value={app.updatedAt}
              />
            </dl>

            {(app.website || app.supportEmail) && (
              <>
                <Separator className="my-4" />
                <div className="flex flex-col gap-3 text-sm">
                  {app.website && (
                    <a
                      href={app.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Globe className="size-4 shrink-0" />
                      <span className="truncate" dir="ltr">
                        {app.website}
                      </span>
                    </a>
                  )}
                  {app.supportEmail && (
                    <a
                      href={`mailto:${app.supportEmail}`}
                      className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-primary"
                    >
                      <Mail className="size-4 shrink-0" />
                      <span className="truncate" dir="ltr">
                        {app.supportEmail}
                      </span>
                    </a>
                  )}
                </div>
              </>
            )}

            <Separator className="my-4" />

            <div className="flex items-start gap-2 text-sm">
              <Monitor className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground">پلتفرم‌های پشتیبانی</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {app.platforms.map((p) => (
                    <Badge key={p} variant="secondary" className="font-normal">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <h3 className="text-sm font-bold">برچسب‌ها</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {app.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="font-normal">
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Check className="size-4" />
              تأییدشده توسط نت‌استور
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              این اپلیکیشن از نظر امنیت و کیفیت بررسی شده است.
            </p>
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">اپ‌های مشابه</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((r) => (
              <AppCard key={r.id} app={r} />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}

function MetaItem({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode
  value: string
  label: string
}) {
  return (
    <div className="flex flex-col">
      <span className="flex items-center gap-1.5 font-semibold">
        {icon}
        {value}
      </span>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="flex items-center gap-2 text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

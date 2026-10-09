import Link from 'next/link'
import { Headphones, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const highlights = [
  [Users, 'بیش از ۱۵۰ هزار', 'کاربر فعال'],
  [Headphones, 'پشتیبانی تخصصی', 'برای توسعه‌دهندگان'],
] as const

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-20">
      <section className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <h1 className="mt-4 max-w-2xl text-balance text-4xl font-bold tracking-tight sm:text-6xl">
            اپلیکیشن شما، در خانه کاربران تلویزیونی
          </h1>

          <p className="mt-6 max-w-xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">
            نت‌استور فضای انتشار اپلیکیشن‌های Android TV است؛ جایی برای معرفی و رساندن محصول شما به کاربران تلویزیون و اندروید باکس.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button render={<Link href="/upload" />} size="lg">
              انتشار اپلیکیشن
            </Button>
            <Button render={<Link href="/guide" />} size="lg" variant="outline">
              راهنمای انتشار
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-10 gap-y-5 border-t border-border pt-6">
            {highlights.map(([Icon, value, label]) => (
              <div key={value} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{value}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-secondary/40">
          <img
            src="/netstore-showcase.png"
            alt="نمایی از فضای نت‌استور روی تلویزیون"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>
    </main>
  )
}

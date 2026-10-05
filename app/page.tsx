import Link from 'next/link'
import { ArrowLeft, Headphones, MonitorPlay, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'

const features = [
  [Users, 'بیش از ۱۵۰ هزار کاربر فعال'],
  [Headphones, 'پشتیبانی تخصصی'],
  [MonitorPlay, 'تنها فروشگاه نرم‌افزاری اختصاصی اندروید تی‌وی'],
] as const

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-16">
      <section className="relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm">
        <div className="grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_0.9fr] lg:p-14">
          <div>
            <img src="https://netstore.app/logo/netstore-logo-blue.svg" alt="لوگوی نت‌استور" className="h-12 w-auto" />
            <p className="mt-6 text-sm font-semibold tracking-[0.16em] text-primary">فروشگاه اختصاصی Android TV</p>
            <h1 className="mt-4 text-balance text-4xl font-bold tracking-tight sm:text-6xl">اپلیکیشن شما، در خانه کاربران تلویزیونی</h1>
            <p className="mt-6 max-w-xl text-pretty text-base leading-8 text-muted-foreground sm:text-lg">نت‌استور تنها فروشگاه نرم‌افزاری اختصاصی اندروید تی‌وی است؛ جایی برای دیده‌شدن اپلیکیشن شما توسط کاربران تلویزیون و اندروید باکس.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button render={<Link href="/guide" />} size="lg" variant="outline">راهنمای انتشار<ArrowLeft className="size-4" /></Button>
            </div>
            <p className="mt-6 max-w-xl text-sm font-medium leading-7 text-primary">اپلیکیشن‌تان را در نت‌استور منتشر کنید و مسیر رسیدن به کاربران واقعی Android TV را کوتاه‌تر کنید.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
            <img src="/netstore-showcase.png" alt="نمایی از فضای نت‌استور روی تلویزیون" className="h-full min-h-64 w-full object-cover" />
          </div>
        </div>
      </section>
      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {features.map(([Icon, title]) => <div key={title} className="rounded-2xl border border-border bg-card p-6"><Icon className="size-6 text-primary" /><h2 className="mt-4 font-bold leading-7">{title}</h2></div>)}
      </section>
    </main>
  )
}

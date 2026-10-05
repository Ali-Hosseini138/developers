import Link from 'next/link'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toFa } from '@/lib/format'

export function HomeHero({ appCount }: { appCount: number }) {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-secondary/50 to-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5 text-primary" />
            بازارچه اپلیکیشن توسعه‌دهندگان ایرانی
          </div>

          <h1 className="mt-6 max-w-2xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            ابزارهای ساخته‌شده توسط توسعه‌دهندگان، برای توسعه‌دهندگان
          </h1>

          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            اپلیکیشن خودت را منتشر کن، بازخورد بگیر و در میان بهترین ابزارهای
            نرم‌افزاری ایرانی دیده شو.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              render={<Link href="/upload" />}
              size="lg"
              className="gap-2"
            >
              انتشار اپلیکیشن
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              render={<Link href="#browse" />}
              size="lg"
              variant="outline"
            >
              مرور فروشگاه
            </Button>
          </div>

          <div className="mt-12 flex items-center gap-8">
            <Stat value={`+${toFa(appCount)}`} label="اپلیکیشن" />
            <div className="h-10 w-px bg-border" />
            <Stat value={`+${toFa(500)}`} label="توسعه‌دهنده" />
            <div className="h-10 w-px bg-border" />
            <Stat value={`+${toFa(600)}هزار`} label="دانلود" />
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-2xl font-bold tracking-tight">{value}</span>
      <span className="mt-1 text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

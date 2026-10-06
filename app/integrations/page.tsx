import Link from 'next/link'
import { ArrowLeft, ArrowRight, CreditCard, LogIn } from 'lucide-react'

const guides = [
  {
    href: '/integrations/payment',
    title: 'مراحل پیاده سازی خرید درون‌برنامه‌ای',
    description: 'راهنمای اتصال اپلیکیشن به Netbox Payment System، روش‌های خرید، پارامترها و APIهای موردنیاز.',
    icon: CreditCard,
  },
  {
    href: '/integrations/sso',
    title: 'مراحل پیاده سازی ورود یکپارچه',
    description: 'راهنمای اتصال اپلیکیشن به Netbox SSO، دریافت نتیجه ورود و اعتبارسنجی token.',
    icon: LogIn,
  },
] as const

export default function IntegrationsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <Link href="/guide" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به راهنما
      </Link>

      <div className="mt-8">
        <p className="text-sm font-semibold text-primary">راهنمای فنی توسعه‌دهندگان</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">راهنمای یکپارچه‌سازی</h1>
        <p className="mt-4 max-w-2xl leading-8 text-muted-foreground">
          مستندات فنی موردنیاز برای اتصال اپلیکیشن به سرویس‌های نت‌باکس را از این بخش دنبال کنید.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {guides.map(({ href, title, description, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-5 text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              مشاهده مراحل
              <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            </span>
          </Link>
        ))}
      </div>
    </main>
  )
}

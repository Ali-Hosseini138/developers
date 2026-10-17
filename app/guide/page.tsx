import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileArchive,
  Image,
  ListChecks,
  Monitor,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { DeveloperSidebar } from '@/components/developer-sidebar'

const steps = [
  ['فایل APK', 'فایل APK مخصوص Android TV را بارگذاری کنید. فایل باید معتبر و حداکثر ۳۰۰ مگابایت باشد.', FileArchive],
  ['اطلاعات پایه', 'عنوان، توضیحات، دسته‌بندی، Package Name و محدودیت سنی را تکمیل کنید.', ListChecks],
  ['اطلاعات نمایشی', 'وب‌سایت و ایمیل پشتیبانی را وارد کنید تا کاربران راه ارتباطی معتبر داشته باشند.', Send],
  ['تصاویر و رسانه', 'آیکون ۱:۱، بنر افقی با نسبت حداقل ۱٫۵ و تصاویر محیط واقعی از محیط تلویزیونی اپلیکیشن را اضافه کنید.', Image],
  ['بازبینی و ارسال برای بررسی', 'اطلاعات را بررسی کنید و برای تیم نت‌استور بفرستید؛ انتشار فقط پس از تأیید کارشناس انجام می‌شود.', CheckCircle2],
] as const


export default function GuidePage() {
  return (
    <>
      <DeveloperSidebar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:pr-32">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت
      </Link>

      <header className="mt-8">
        <p className="text-sm font-semibold text-primary">نت‌استور برای توسعه‌دهندگان Android TV</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">راهنمای انتشار اپلیکیشن</h1>
        <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
          برای ارسال اپلیکیشن به نت‌استور، فایل و اطلاعات برنامه را طبق مراحل زیر آماده کنید. معیارهای بررسی و الزامات انتشار در صفحه «قوانین انتشار» آمده است.
        </p>
      </header>

      <section className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Monitor className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="font-bold">مهم: نت‌استور یک فروشگاه Android TV است</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              اولویت نت‌استور، اپلیکیشن‌هایی است که مشخصاً برای Android TV توسعه داده شده‌اند. اگر اپلیکیشن مخصوص Android TV نیست، تنها در صورتی قابل بررسی است که تمام بخش‌های اصلی آن با ایرماوس یا ماوس به‌راحتی قابل استفاده باشند. در این حالت، عبارت «این اپلیکیشن با ایرماوس یا ماوس قابل استفاده است.» در خط اول توضیحات برنامه درج می‌شود.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">مراحل ارسال برنامه</h2>
        <div className="mt-5 flex flex-col gap-4">
          {steps.map(([title, text, Icon], index) => (
            <div key={title} className="flex gap-4 rounded-2xl border border-border bg-card p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold text-primary">گام {index + 1}</p>
                <h3 className="mt-1 font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-border bg-card p-5">
        <Link href="/rules" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
          مشاهده قوانین انتشار اپلیکیشن
          <ArrowLeft className="size-4" />
        </Link>
      </div>
      <section className="mt-10 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-xl font-bold">پیش از ارسال برای بررسی</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              برنامه را حداقل روی یک Android TV یا Android TV Box واقعی تست کنید و مسیرهای ورود، پخش محتوا، Back، Home، Resume، جستجو، پرداخت و تمام گزینه‌های قابل Focus را بررسی کنید. اگر برنامه نیازمند حساب یا شرایط خاصی برای تست است، اطلاعات لازم را از طریق تیکت برای تیم بررسی ارسال کنید.
            </p>
          </div>
        </div>
      </section>
      </main>
    </>
  )
}

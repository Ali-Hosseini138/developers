import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به صفحه اصلی
      </Link>

      <div className="mt-8 rounded-3xl border border-border bg-card p-7 sm:p-10">
        <img src="https://netstore.app/logo/netstore-logo-blue.svg" alt="لوگوی نت‌استور" className="h-12 w-auto" />
        <h1 className="mt-7 text-3xl font-bold">درباره نت‌استور</h1>

        <div className="mt-5 space-y-5 leading-8 text-muted-foreground">
          <p>
            نت‌استور فروشگاه نرم‌افزاری ویژه تلویزیون‌ها و دستگاه‌های Android TV است. این سرویس ابتدا برای کاربران دستگاه‌های نت‌باکس شکل گرفت و امروز امکان انتشار و معرفی اپلیکیشن‌های سازگار با تجربه تلویزیونی را در اختیار توسعه‌دهندگان قرار می‌دهد.
          </p>
          <p>
            پنل توسعه‌دهندگان نت‌استور برای مدیریت چرخه انتشار ساخته شده است؛ از ثبت اطلاعات و فایل APK تا بررسی، انتشار نسخه‌های جدید، مشاهده آمار و ارتباط با تیم پشتیبانی.
          </p>
          <p>
            تمرکز نت‌استور روی اپلیکیشن‌هایی است که تجربه مناسبی روی صفحه تلویزیون ارائه می‌کنند. اپلیکیشن‌هایی که مستقیماً برای Android TV توسعه داده نشده‌اند نیز در صورت سازگاری مناسب با ماوس یا ایرماوس می‌توانند برای بررسی ارسال شوند.
          </p>
        </div>
      </div>
    </main>
  )
}

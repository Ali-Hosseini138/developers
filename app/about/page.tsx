import Link from 'next/link'
import { ArrowRight, Mail, Phone } from 'lucide-react'

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
            تمرکز نت‌استور روی اپلیکیشن‌هایی است که تجربه مناسبی روی صفحه تلویزیون ارائه می‌کنند. اپ‌هایی که مستقیماً برای Android TV توسعه داده نشده‌اند نیز در صورت سازگاری مناسب با ماوس یا ایرماوس می‌توانند برای بررسی ارسال شوند.
          </p>
        </div>

        <section id="support" className="mt-8 scroll-mt-24">
          <h2 className="text-xl font-bold">ارتباط با پشتیبانی</h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            توسعه‌دهندگان عضو پنل می‌توانند از بخش «پشتیبانی و تیکت» درخواست خود را پیگیری کنند. برای ارتباط عمومی نیز از راه‌های زیر استفاده کنید.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <a href="mailto:info@netbox.info" className="flex items-center gap-3 rounded-xl bg-secondary/60 p-4">
              <Mail className="size-5 text-primary" />
              <span dir="ltr">info@netbox.info</span>
            </a>
            <a href="tel:02182808606" className="flex items-center gap-3 rounded-xl bg-secondary/60 p-4">
              <Phone className="size-5 text-primary" />
              <span dir="ltr">۰۲۱ ۸۲۸۰ ۸۶۰۶</span>
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}

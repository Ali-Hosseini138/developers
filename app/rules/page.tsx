import Link from 'next/link'
import { ArrowRight, ShieldCheck } from 'lucide-react'

const rules = [
  ['محتوا علیه اخلاق و امنیت عمومی', 'انتشار محتوایی که برخلاف اخلاق عمومی، امنیت جامعه یا قوانین جاری باشد پذیرفته نیست.'],
  ['محتوای مجرمانه', 'برنامه نباید شامل آموزش، تبلیغ، تسهیل یا تشویق جرم، کلاهبرداری، خشونت یا فعالیت غیرقانونی باشد.'],
  ['محتوای مخرب و خطرناک', 'بدافزار، جاسوس‌افزار، کد مخرب، رفتار فریبنده یا قابلیت‌هایی که به دستگاه و کاربر آسیب می‌زنند ممنوع‌اند.'],
  ['محتوای ناقض حریم شخصی کاربران', 'دریافت، ذخیره یا اشتراک‌گذاری اطلاعات شخصی باید شفاف، ضروری و با اطلاع و رضایت کاربر انجام شود.'],
  ['کیفیت برنامه', 'برنامه باید محتوای کافی، رابط کاربری قابل فهم، تجربه مناسب و ارزش مشخصی برای کاربر داشته باشد؛ نسخه‌های ناقص یا کپی بررسی نمی‌شوند.'],
  ['عملکرد برنامه', 'اپ باید نصب و اجرا شود، پایدار باشد، با Android TV سازگار باشد و هنگام بررسی با خطاهای جدی، توقف ناگهانی یا مسیرهای ناقص مواجه نشود.'],
  ['اطلاعات محرمانه، امنیت، حریم خصوصی و دسترسی‌ها', 'دسترسی‌ها باید فقط برای قابلیت‌های ضروری درخواست شوند و نحوه استفاده از داده‌ها و اطلاعات محرمانه در توضیحات برنامه مشخص باشد.'],
  ['مالکیت معنوی و فکری محتوا (کپی‌رایت و سایر مصادیق)', 'توسعه‌دهنده باید مالک یا مجاز به استفاده از کد، تصویر، صدا، ویدیو، نام تجاری و سایر محتوای برنامه باشد.'],
  ['مجوزهای برنامه', 'برای برنامه‌هایی که به مجوز تخصصی یا قانونی نیاز دارند، ارائه مجوز معتبر از نهاد مربوطه پیش از انتشار الزامی است.'],
]

export default function RulesPage() {
  return <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="size-4" />بازگشت به صفحه اصلی</Link><div className="mt-8 flex items-start gap-4"><span className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><ShieldCheck className="size-6" /></span><div><p className="text-sm font-semibold text-primary">نت‌استور</p><h1 className="mt-1 text-3xl font-bold tracking-tight">قوانین انتشار اپلیکیشن</h1><p className="mt-3 leading-8 text-muted-foreground">این چارچوب با الهام از الزامات عمومی انتشار در فروشگاه‌های ایرانی مانند مایکت و کافه‌بازار تنظیم شده و برای بررسی کارشناسی نت‌استور کاربرد دارد.</p></div></div><div className="mt-10 grid gap-4">{rules.map(([title, description], index) => <article key={title} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start gap-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-primary">{index + 1}</span><div><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p></div></div></article>)}</div><p className="mt-8 text-sm leading-7 text-muted-foreground">نت‌استور می‌تواند در صورت مشاهده مغایرت، پیش‌نویس یا نسخه منتشرشده را برای اصلاح بازگرداند یا دسترسی آن را محدود کند.</p></main>
}

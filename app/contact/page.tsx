import Link from 'next/link'
import { ArrowRight, Mail, Phone } from 'lucide-react'

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="size-4" />
        بازگشت به صفحه اصلی
      </Link>

      <div className="mt-8">
        <section id="support" className="rounded-3xl border border-border bg-card p-7 sm:p-10">
          <h1 className="text-3xl font-bold">ارتباط با پشتیبانی</h1>
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

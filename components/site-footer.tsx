'use client'

import Link from 'next/link'
import { useStore } from '@/components/store-provider'

export function SiteFooter() {
  const { user } = useStore()
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center">
              <img src="https://netstore.app/logo/netstore-logo-blue.svg" alt="لوگوی نت‌استور" className="h-9 w-auto" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              نت‌استور بستر انتشار، معرفی و دسترسی به اپلیکیشن‌های Android TV است.
            </p>
            <div className="mt-4 flex flex-col gap-1 text-sm text-muted-foreground" dir="ltr">
              <span>info@netbox.info</span>
              <span>۰۲۱ ۸۲۸۰ ۸۶۰۶</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <FooterCol
              title="فروشگاه"
              links={[
                { label: 'انتشار اپ', href: '/upload' },
                { label: 'داشبورد', href: '/dashboard' },
              ]}
            />
            <FooterCol
              title="توسعه‌دهندگان"
              links={[
                { label: 'راهنمای انتشار', href: '/guide' },
                { label: 'راهنمای فنی', href: '/integrations' },
                ...(!user
                  ? [
                      { label: 'ورود', href: '/login' },
                      { label: 'ثبت‌نام', href: '/signup' },
                    ]
                  : []),
              ]}
            />
            <FooterCol
              title="درباره"
              links={[
                { label: 'درباره ما', href: '/about' },
                { label: 'قوانین', href: '/rules' },
                { label: 'تماس', href: '/about#support' },
              ]}
            />
          </div>
        </div>

        <div className="mt-10 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          تمام حقوق مادی و معنوی این وبسایت متعلق به شرکت توسعه ارتباطات دیجیتال سپهر (نت‌باکس) می‌باشد
        </div>
      </div>
    </footer>
  )
}

function FooterCol({
  title,
  links,
}: {
  title: string
  links: { label: string; href: string }[]
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

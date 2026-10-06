import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Vazirmatn, JetBrains_Mono } from 'next/font/google'
import { StoreProvider } from '@/components/store-provider'
import { SiteChrome } from '@/components/site-chrome'
import './globals.css'

const vazir = Vazirmatn({
  subsets: ['arabic', 'latin'],
  variable: '--font-vazir',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-code',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'پنل توسعه‌دهندگان نت‌استور',
  description:
    'پنل توسعه‌دهندگان نت‌استور برای ثبت، بررسی، انتشار و مدیریت اپلیکیشن‌های Android TV.',
}

export const viewport: Viewport = {
  themeColor: '#5b3df5',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="fa"
      dir="rtl"
      className={`light ${vazir.variable} ${jetbrainsMono.variable} bg-background`}
    >
      <body className="antialiased font-sans">
        <StoreProvider>
          <SiteChrome>{children}</SiteChrome>
        </StoreProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

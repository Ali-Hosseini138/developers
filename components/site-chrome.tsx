'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { useStore } from '@/components/store-provider'

const protectedPrefixes = ['/dashboard', '/upload', '/account']

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, authReady } = useStore()
  const isAdmin = pathname?.startsWith('/admin')
  const requiresTerms = Boolean(
    pathname &&
    protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
  )

  useEffect(() => {
    if (!authReady || !user || !requiresTerms || user.termsAcceptedAt) return
    router.replace(`/terms?next=${encodeURIComponent(pathname || '/dashboard')}`)
  }, [authReady, user, requiresTerms, pathname, router])

  if (isAdmin) {
    return <div className="flex min-h-screen flex-col">{children}</div>
  }

  if (requiresTerms && authReady && user && !user.termsAcceptedAt) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <div className="flex flex-1 items-center justify-center">
          <span className="text-sm text-muted-foreground">در حال انتقال به قوانین...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}

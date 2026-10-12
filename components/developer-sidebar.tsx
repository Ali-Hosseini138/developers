'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Activity,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Megaphone,
  Package,
  Wallet,
} from 'lucide-react'

const dashboardItems = [
  { id: 'apps', label: 'داشبورد من', icon: Package },
  { id: 'analytics', label: 'آمار و عملکرد', icon: Activity },
  { id: 'finance', label: 'مالی', icon: Wallet },
  { id: 'growth', label: 'تبلیغات و رشد', icon: Megaphone },
  { id: 'support', label: 'پشتیبانی و تیکت', icon: HelpCircle },
] as const

const docs = [
  { href: '/integrations', label: 'راهنمای فنی' },
  { href: '/rules', label: 'قوانین انتشار' },
  { href: '/guide', label: 'مراحل انتشار' },
  { href: '/faq', label: 'سؤالات پرتکرار' },
] as const

export type DeveloperDashboardTab = (typeof dashboardItems)[number]['id']

export function DeveloperSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab?: DeveloperDashboardTab
  onTabChange?: (tab: DeveloperDashboardTab) => void
}) {
  const pathname = usePathname()
  const onDocsPage = pathname.startsWith('/integrations') || pathname.startsWith('/rules') || pathname.startsWith('/guide') || pathname.startsWith('/faq')
  const [docsOpen, setDocsOpen] = useState(onDocsPage)

  function dashboardHref(id: DeveloperDashboardTab) {
    return id === 'apps' ? '/dashboard' : `/dashboard?tab=${id}`
  }

  return (
    <>
      <aside className="fixed bottom-0 right-0 top-16 z-40 hidden w-28 border-l border-border bg-secondary/35 px-2 py-5 lg:flex lg:flex-col">
        <nav className="flex flex-1 flex-col gap-1.5 overflow-y-auto">
          {dashboardItems.map(({ id, label, icon: Icon }) => {
            const active = pathname === '/dashboard' && activeTab === id
            return onTabChange && pathname === '/dashboard' ? (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${active ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                <Icon className="size-5" />
                <span className="text-center leading-5">{label}</span>
              </button>
            ) : (
              <Link
                key={id}
                href={dashboardHref(id)}
                className="flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Icon className="size-5" />
                <span className="text-center leading-5">{label}</span>
              </Link>
            )
          })}

          <div className="mt-1 border-t border-border pt-2">
            <button
              type="button"
              onClick={() => setDocsOpen((open) => !open)}
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-medium transition-colors ${onDocsPage ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
              aria-expanded={docsOpen}
            >
              <BookOpen className="size-5" />
              <span className="flex items-center gap-1 text-center leading-5">
                مستندات فنی
                {docsOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              </span>
            </button>

            {docsOpen && (
              <div className="mt-1 flex flex-col gap-1">
                {docs.map((item) => {
                  const active = item.href === '/integrations'
                    ? pathname.startsWith('/integrations')
                    : pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-lg px-2 py-2 text-center text-[11px] leading-5 transition-colors ${active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </nav>
      </aside>

      <div className="mb-5 lg:hidden">
        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-border bg-card p-2">
          {dashboardItems.map(({ id, label, icon: Icon }) => {
            const active = pathname === '/dashboard' && activeTab === id
            return onTabChange && pathname === '/dashboard' ? (
              <button
                key={id}
                type="button"
                onClick={() => onTabChange(id)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ) : (
              <Link key={id} href={dashboardHref(id)} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground">
                <Icon className="size-4" />
                {label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setDocsOpen((open) => !open)}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${onDocsPage ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
            aria-expanded={docsOpen}
          >
            <BookOpen className="size-4" />
            مستندات فنی
            {docsOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        </div>

        {docsOpen && (
          <div className="mt-2 grid gap-2 rounded-2xl border border-border bg-card p-2 sm:grid-cols-3">
            {docs.map((item) => {
              const active = item.href === '/integrations'
                ? pathname.startsWith('/integrations')
                : pathname.startsWith(item.href)
              return (
                <Link key={item.href} href={item.href} className={`rounded-xl px-3 py-2.5 text-center text-sm ${active ? 'bg-primary/10 font-semibold text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>
                  {item.label}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, LogOut, Settings, User as UserIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useStore } from '@/components/store-provider'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const { user, logout } = useStore()
  const navLinks = [
    user ? { href: '/dashboard', label: 'داشبورد من' } : { href: '/', label: 'خانه' },
    { href: '/integrations', label: 'راهنمای فنی' },
    { href: '/guide', label: 'راهنمای انتشار' },
  ]
  const pathname = usePathname()
  const router = useRouter()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="https://netstore.app/logo/netstore-logo-blue.svg" alt="نت استور" className="h-9 w-auto" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground',
                (link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)) && 'bg-secondary text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="باز کردن منوی حساب کاربری">
                <Avatar className="size-9 border border-border">
                  <AvatarFallback className="bg-secondary text-sm font-semibold">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {user.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                  <LayoutDashboard className="size-4" />
                  داشبورد من
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/account')}>
                  <Settings className="size-4" />
                  اطلاعات حساب
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    void logout().finally(() => router.push('/'))
                  }}
                  variant="destructive"
                >
                  <LogOut className="size-4" />
                  خروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              render={<Link href="/login" />}
              variant="outline"
              className="gap-1.5"
            >
              <UserIcon className="size-4" />
              <span className="hidden sm:inline">ورود</span>
            </Button>
          )}
        </div>
      </div>

      <nav className="border-t border-border/70 px-4 py-2 md:hidden">
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors',
                (link.href === '/' ? pathname === '/' : pathname.startsWith(link.href)) && 'bg-secondary text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  )
}

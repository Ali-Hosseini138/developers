'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MOCK_APPS } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'
import type { StoreApp, SupportTicket, User } from '@/lib/types'

interface StoreContextValue {
  apps: StoreApp[]
  user: User | null
  authReady: boolean
  addApp: (app: StoreApp) => Promise<void>
  updateApp: (id: string, patch: Partial<StoreApp>) => Promise<void>
  updateProfile: (patch: Pick<User, 'name' | 'phone' | 'nationalId' | 'organization'>) => Promise<void>
  acceptTerms: () => Promise<void>
  addVersion: (appId: string, apk: { pathname: string; name: string; size: number }, packageName: string | undefined, changelog: string) => Promise<void>
  removeApp: (id: string) => Promise<void>
  submitAppForReview: (id: string) => Promise<void>
  getApp: (id: string) => StoreApp | undefined
  myApps: StoreApp[]
  tickets: SupportTicket[]
  addTicket: (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'developer'>) => Promise<void>
  login: (user: User) => void
  logout: () => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)
const supabase = createClient()

function mapApp(row: Record<string, any>): StoreApp {
  return { id: row.id, name: row.name, nameEn: row.name_en || undefined, tagline: row.tagline || '', taglineEn: row.tagline_en || undefined, description: row.description || '', descriptionEn: row.description_en || undefined, category: row.category || 'تکنولوژی و اینترنت', icon: row.icon_path ? `/api/blob-file?pathname=${encodeURIComponent(row.icon_path)}` : row.icon_url || '/placeholder.svg', banner: row.banner_path ? `/api/blob-file?pathname=${encodeURIComponent(row.banner_path)}` : row.banner_url || undefined, screenshots: (row.screenshot_paths || []).map((path: string) => `/api/blob-file?pathname=${encodeURIComponent(path)}`), developer: row.owner_name || 'توسعه‌دهنده', ownerId: row.owner_id || undefined, status: row.status || 'draft', version: '', price: 0, rating: 0, downloads: 0, platforms: [], tags: [], updatedAt: new Date(row.updated_at).toLocaleDateString('fa-IR'), reviews: [], website: row.website || undefined, supportEmail: row.support_email || undefined, packageName: row.package_name || undefined, ageRestriction: row.age_restriction || undefined, hasInAppPayment: Boolean(row.has_in_app_payment), netboxPaymentIntegrated: Boolean(row.netbox_payment_integrated), netboxPaymentGraceAccepted: Boolean(row.netbox_payment_grace_accepted), netboxPaymentGraceDeadline: row.netbox_payment_grace_deadline || undefined, developedForAndroidTv: row.developed_for_android_tv !== false, airMouseCompatible: Boolean(row.air_mouse_compatible), reviewReason: row.review_reason || undefined, reviewedAt: row.reviewed_at || undefined, apkName: row.apk_name || undefined, apkSize: row.apk_size ? `${(Number(row.apk_size) / 1024 / 1024).toFixed(1)} مگابایت` : undefined, apkPath: row.apk_path || undefined, iconPath: row.icon_path || undefined, bannerPath: row.banner_path || undefined, screenshotPaths: row.screenshot_paths || [] }
}

function mapTicket(row: Record<string, any>, developer: string): SupportTicket {
  return {
    id: row.id,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: new Date(row.created_at).toLocaleString('fa-IR'),
    developer,
    adminReply: row.admin_reply || undefined,
    repliedAt: row.replied_at ? new Date(row.replied_at).toLocaleString('fa-IR') : undefined,
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<StoreApp[]>(MOCK_APPS)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  const loadPublishedApps = useCallback(async () => {
    const { data } = await supabase
      .from('apps')
      .select('*')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })

    if (!data) return
    const rows = data as Record<string, any>[]
    setApps((current) => [
      ...rows.map(mapApp),
      ...current.filter((app) => !rows.some((row) => row.id === app.id)),
    ])
  }, [])

  useEffect(() => {
    void loadPublishedApps()

    const loadBackendSession = async () => {
      try {
        let response = await fetch('/api/auth/session', { cache: 'no-store' })

        if (response.status === 401) {
          const refreshed = await fetch('/api/auth/refresh', { method: 'POST' })
          if (refreshed.ok) response = await fetch('/api/auth/session', { cache: 'no-store' })
        }

        if (!response.ok) {
          setUser(null)
          setTickets([])
          return
        }

        const payload = await response.json()
        const sessionUser = payload.user ?? null

        if (sessionUser?.id) {
          const [profileResponse, appsResponse, ticketsResponse] = await Promise.all([
            fetch('/api/developer/profile', { cache: 'no-store' }),
            fetch('/api/developer/apps', { cache: 'no-store' }),
            fetch('/api/developer/tickets', { cache: 'no-store' }),
          ])

          const profilePayload = profileResponse.ok ? await profileResponse.json() : null
          const nextUser = profilePayload?.profile || sessionUser
          setUser(nextUser)

          if (appsResponse.ok) {
            const appsPayload = await appsResponse.json()
            const rows = Array.isArray(appsPayload.apps) ? appsPayload.apps as Record<string, any>[] : []
            setApps((current) => [
              ...rows.map((row) => mapApp({ ...row, owner_name: nextUser.name })),
              ...current.filter((app) => !rows.some((row) => row.id === app.id)),
            ])
          }

          if (ticketsResponse.ok) {
            const ticketsPayload = await ticketsResponse.json()
            const rows = Array.isArray(ticketsPayload.tickets) ? ticketsPayload.tickets as Record<string, any>[] : []
            setTickets(rows.map((row) => mapTicket(row, nextUser.name)))
          }
        } else {
          setUser(null)
          setTickets([])
        }
      } catch {
        setUser(null)
      } finally {
        setAuthReady(true)
      }
    }

    void loadBackendSession()
  }, [loadPublishedApps])

  const addApp = useCallback(async (app: StoreApp) => {
    if (!user?.id) return
    const { data, error } = await supabase.from('apps').insert({ owner_id: user.id, name: app.name, tagline: app.tagline, description: app.description, category: app.category, age_restriction: app.ageRestriction, package_name: app.packageName, icon_url: app.iconPath ? null : app.icon, banner_url: app.bannerPath ? null : app.banner, website: app.website, support_email: app.supportEmail, status: app.status || 'draft', apk_path: app.apkPath, apk_name: app.apkName, apk_size: app.apkSize ? Number.parseInt(app.apkSize.replace(/[^0-9]/g, ''), 10) : null, icon_path: app.iconPath, banner_path: app.bannerPath, screenshot_paths: app.screenshotPaths || [] }).select().single()
    if (error) throw error
    setApps((prev) => [mapApp({ ...data, owner_name: user.name }), ...prev])
  }, [user])

  const updateApp = useCallback(async (id: string, patch: Partial<StoreApp>) => {
    if (!user?.id) throw new Error('unauthorized')
    const response = await fetch(`/api/developer/apps/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: patch.name,
        nameEn: patch.nameEn,
        tagline: patch.tagline,
        taglineEn: patch.taglineEn,
        description: patch.description,
        descriptionEn: patch.descriptionEn,
        category: patch.category,
        ageRestriction: patch.ageRestriction,
        packageName: patch.packageName,
        website: patch.website,
        supportEmail: patch.supportEmail,
        iconPath: patch.iconPath,
        bannerPath: patch.bannerPath,
        screenshotPaths: patch.screenshotPaths,
      }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'app_update_failed')
    setApps((prev) => prev.map((app) => app.id === id ? mapApp({ ...payload.app, owner_name: user.name }) : app))
  }, [user?.id, user?.name])

  const updateProfile = useCallback(async (patch: Pick<User, 'name' | 'phone' | 'nationalId' | 'organization'>) => {
    if (!user?.id) throw new Error('unauthorized')
    const response = await fetch('/api/developer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'profile_update_failed')
    setUser(payload.profile)
  }, [user?.id])

  const acceptTerms = useCallback(async () => {
    if (!user?.id) throw new Error('unauthorized')
    const response = await fetch('/api/developer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acceptTerms: true }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'terms_update_failed')
    setUser(payload.profile)
  }, [user?.id])

  const addVersion = useCallback(async (appId: string, apk: { pathname: string; name: string; size: number }, packageName: string | undefined, changelog: string) => {
    if (!user?.id) throw new Error('unauthorized')
    const response = await fetch(`/api/developer/apps/${encodeURIComponent(appId)}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apk, packageName, changelog }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'version_create_failed')
  }, [user?.id])

  const removeApp = useCallback(async (id: string) => {
    if (!user?.id) throw new Error('unauthorized')
    const response = await fetch(`/api/developer/apps/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'delete_failed')
    setApps((prev) => prev.filter((app) => app.id !== id))
  }, [user?.id])
  const submitAppForReview = useCallback(async (id: string) => {
    const response = await fetch(`/api/apps/${encodeURIComponent(id)}/submit`, {
      method: 'POST',
    })

    const result = await response.json().catch(() => null)

    if (!response.ok) {
      const error = new Error(result?.error || 'submit_failed') as Error & { missing?: string[] }
      error.missing = result?.missing
      throw error
    }

    setApps((prev) => prev.map((app) => (
      app.id === id
        ? { ...app, status: 'pending', updatedAt: 'امروز' }
        : app
    )))
  }, [])
  const getApp = useCallback((id: string) => apps.find((app) => app.id === id), [apps])
  const addTicket = useCallback(async (ticket: Omit<SupportTicket, 'id' | 'createdAt' | 'developer'>) => {
    if (!user?.id) throw new Error('unauthorized')
    const response = await fetch('/api/developer/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subject: ticket.subject, message: ticket.message }),
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.error || 'ticket_create_failed')
    setTickets((prev) => [mapTicket(payload.ticket, user.name), ...prev])
  }, [user])
  const login = useCallback((u: User) => setUser(u), [])
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUser(null)
      setTickets([])
    }
  }, [])
  const myApps = useMemo(() => user?.id ? apps.filter((app) => app.ownerId === user.id) : [], [apps, user?.id])
  const value = useMemo(() => ({ apps, user, authReady, addApp, updateApp, updateProfile, acceptTerms, addVersion, removeApp, submitAppForReview, getApp, myApps, tickets, addTicket, login, logout }), [apps, user, authReady, addApp, updateApp, updateProfile, acceptTerms, addVersion, removeApp, submitAppForReview, getApp, myApps, tickets, addTicket, login, logout])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() { const ctx = useContext(StoreContext); if (!ctx) throw new Error('useStore باید داخل StoreProvider استفاده شود'); return ctx }

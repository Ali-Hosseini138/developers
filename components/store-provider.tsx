'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MOCK_APPS } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'
import type { StoreApp, SupportTicket, User } from '@/lib/types'
import { mapDeveloperHubApp } from '@/lib/developer-hub-model'

interface StoreContextValue {
  apps: StoreApp[]
  user: User | null
  authReady: boolean
  updateProfile: (patch: Pick<User, 'name' | 'phone' | 'nationalId' | 'organization'>) => Promise<void>
  acceptTerms: () => Promise<void>
  getApp: (id: string) => StoreApp | undefined
  myApps: StoreApp[]
  reloadDeveloperApps: () => Promise<void>
  cancelSubmission: (submissionId: string) => Promise<void>
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
  const [developerApps, setDeveloperApps] = useState<StoreApp[]>([])
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

  const loadDeveloperAppsFor = useCallback(async (developerName: string) => {
    const response = await fetch('/api/developer-hub/apps?page=1&page_size=200', { cache: 'no-store' })
    if (!response.ok) {
      if (response.status === 401) setDeveloperApps([])
      return
    }

    const payload = await response.json().catch(() => null)
    const rows = Array.isArray(payload?.results) ? payload.results : []

    const detailedRows = await Promise.all(rows.map(async (row: any) => {
      try {
        const detailResponse = await fetch(`/api/developer-hub/apps/${encodeURIComponent(String(row.id))}`, { cache: 'no-store' })
        if (!detailResponse.ok) return row
        return await detailResponse.json()
      } catch {
        return row
      }
    }))

    setDeveloperApps(detailedRows.map((row: any) => mapDeveloperHubApp(row, developerName)))
  }, [])

  const reloadDeveloperApps = useCallback(async () => {
    await loadDeveloperAppsFor(user?.name || 'توسعه‌دهنده')
  }, [loadDeveloperAppsFor, user?.name])

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
          setDeveloperApps([])
          setTickets([])
          return
        }

        const payload = await response.json()
        const sessionUser = payload.user ?? null

        if (sessionUser?.id) {
          const [profileResponse, ticketsResponse] = await Promise.all([
            fetch('/api/developer/profile', { cache: 'no-store' }),
            fetch('/api/developer/tickets', { cache: 'no-store' }),
          ])

          const profilePayload = profileResponse.ok ? await profileResponse.json() : null
          const nextUser = profilePayload?.profile || sessionUser
          setUser(nextUser)

          await loadDeveloperAppsFor(nextUser.name)

          if (ticketsResponse.ok) {
            const ticketsPayload = await ticketsResponse.json()
            const rows = Array.isArray(ticketsPayload.tickets) ? ticketsPayload.tickets as Record<string, any>[] : []
            setTickets(rows.map((row) => mapTicket(row, nextUser.name)))
          }
        } else {
          setUser(null)
          setDeveloperApps([])
          setTickets([])
        }
      } catch {
        setUser(null)
      } finally {
        setAuthReady(true)
      }
    }

    void loadBackendSession()
  }, [loadPublishedApps, loadDeveloperAppsFor])

  const getApp = useCallback((id: string) => developerApps.find((app) => app.id === id) || apps.find((app) => app.id === id), [developerApps, apps])

  const cancelSubmission = useCallback(async (submissionId: string) => {
    const response = await fetch(`/api/developer-hub/submissions/${encodeURIComponent(submissionId)}/cancel`, {
      method: 'POST',
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) throw new Error(payload?.code || payload?.message || payload?.detail || 'cancel_failed')
    await reloadDeveloperApps()
  }, [reloadDeveloperApps])

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
      setDeveloperApps([])
      setTickets([])
    }
  }, [])
  useEffect(() => {
    if (!user) return
    const processingApps = developerApps.filter(
      (app) => app.latestSubmissionStatus === 'processing' && app.latestSubmissionId,
    )
    if (processingApps.length === 0) return

    const poll = async () => {
      const results = await Promise.all(processingApps.map(async (app) => {
        try {
          const response = await fetch(
            '/api/developer-hub/submissions/' + encodeURIComponent(app.latestSubmissionId!),
            { cache: 'no-store' },
          )
          if (!response.ok) return null
          return await response.json()
        } catch {
          return null
        }
      }))

      if (results.some((submission) => submission && submission.status !== 'processing')) {
        await loadDeveloperAppsFor(user.name)
      }
    }

    const timer = window.setInterval(() => {
      void poll()
    }, 12000)

    return () => window.clearInterval(timer)
  }, [developerApps, loadDeveloperAppsFor, user])

  const myApps = developerApps
  const value = useMemo(() => ({ apps, user, authReady, updateProfile, acceptTerms, getApp, myApps, reloadDeveloperApps, cancelSubmission, tickets, addTicket, login, logout }), [apps, user, authReady, updateProfile, acceptTerms, getApp, myApps, reloadDeveloperApps, cancelSubmission, tickets, addTicket, login, logout])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() { const ctx = useContext(StoreContext); if (!ctx) throw new Error('useStore باید داخل StoreProvider استفاده شود'); return ctx }

'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { StoreApp, SupportTicket, User } from '@/lib/types'
import { ticketError } from '@/lib/support-tickets'
import { mapDeveloperHubApp } from '@/lib/developer-hub-model'

interface StoreContextValue {
  apps: StoreApp[]
  user: User | null
  authReady: boolean
  sessionError: string
  developerAppsLoading: boolean
  developerAppsError: string
  publishedAppsLoading: boolean
  publishedAppsError: string
  updateProfile: (patch: Pick<User, 'firstName' | 'lastName' | 'phone' | 'nationalId' | 'organization'>) => Promise<void>
  acceptTerms: () => Promise<void>
  myApps: StoreApp[]
  reloadDeveloperApps: () => Promise<void>
  cancelSubmission: (submissionId: string) => Promise<void>
  tickets: SupportTicket[]
  ticketsError: string
  reloadTickets: () => Promise<void>
  addTicket: (ticket: { subject: string; question: string }) => Promise<void>
  login: (user: User) => void
  logout: () => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)


export function StoreProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<StoreApp[]>([])
  const [developerApps, setDeveloperApps] = useState<StoreApp[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [developerAppsLoading, setDeveloperAppsLoading] = useState(true)
  const [developerAppsError, setDeveloperAppsError] = useState('')
  const [publishedAppsLoading, setPublishedAppsLoading] = useState(true)
  const [publishedAppsError, setPublishedAppsError] = useState('')
  const accountGeneration = useRef(0)
  const logoutPending = useRef(false)
  const appGeneration = useRef(0)
  const ticketGeneration = useRef(0)
  const [ticketsError, setTicketsError] = useState('')
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  const loadPublishedApps = useCallback(async () => {
    setPublishedAppsLoading(true)
    try {
      const response = await fetch('/api/catalog', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok || !Array.isArray(payload.apps)) throw new Error('published_apps_unavailable')
      setApps(payload.apps)
      setPublishedAppsError('')
    } catch { setPublishedAppsError('دریافت اطلاعات فروشگاه انجام نشد.') }
    finally { setPublishedAppsLoading(false) }
  }, [])

  const loadDeveloperAppsFor = useCallback(async (developerName: string) => {
    const generation = ++appGeneration.current
    setDeveloperAppsLoading(true)
    setDeveloperAppsError('')
    try {
      const rows: any[] = []
      for (let page = 1; ; page++) {
        const response = await fetch(`/api/developer-hub/apps?page=${page}&page_size=200`, { cache: 'no-store' })
        const payload = await response.json().catch(() => null)
        if (generation !== appGeneration.current) return
        if (!response.ok) {
          if (response.status === 401) {
            setDeveloperApps([])
            if (!window.location.pathname?.startsWith('/admin')) window.location.assign('/login?next=/dashboard')
          }
          const message = ticketError(payload, 'دریافت اپلیکیشن‌ها انجام نشد. دوباره تلاش کنید.')
          const reference = typeof payload?.supportReference === 'string' ? ` کد پیگیری: ${payload.supportReference}` : ''
          throw new Error(message + reference)
        }
        if (!Array.isArray(payload?.results)) throw new Error('پاسخ فهرست اپلیکیشن‌ها معتبر نیست.')
        rows.push(...payload.results)
        if (payload.next && (!payload.results.length || page >= 1000)) throw new Error('صفحه‌بندی فهرست اپلیکیشن‌ها معتبر نیست.')
        if (!payload.next) break
      }
      const detailedRows: any[] = []
      // Bound concurrent detail requests, including when the account has many apps.
      for (let index = 0; index < rows.length; index += 6) {
        detailedRows.push(...await Promise.all(rows.slice(index, index + 6).map(async (row: any) => {
          try {
            const response = await fetch(`/api/developer-hub/apps/${encodeURIComponent(String(row.id))}`, { cache: 'no-store' })
            if (generation !== appGeneration.current) return row
            if (response.status === 401 && !window.location.pathname?.startsWith('/admin')) window.location.assign('/login?next=/dashboard')
            if (!response.ok) throw new Error('app_detail_unavailable')
            const detail = await response.json()
            if (String(detail?.id) !== String(row.id)) throw new Error('app_detail_invalid')
            return detail
          } catch { throw new Error('دریافت جزئیات اپلیکیشن‌ها کامل نشد. فهرست را دوباره دریافت کنید.') }
        })))
      }

      if (generation === appGeneration.current) setDeveloperApps(detailedRows.map((row: any) => mapDeveloperHubApp(row, developerName)))
    } catch (error) {
      if (generation === appGeneration.current) setDeveloperAppsError(error instanceof Error ? error.message : 'دریافت اپلیکیشن‌ها انجام نشد.')
      throw error
    } finally { if (generation === appGeneration.current) setDeveloperAppsLoading(false) }
  }, [])

  const reloadDeveloperApps = useCallback(async () => {
    await loadDeveloperAppsFor(user?.name || 'توسعه‌دهنده')
  }, [loadDeveloperAppsFor, user?.name])

  useEffect(() => {
    void loadPublishedApps()

    const loadBackendSession = async () => {
      const generation = accountGeneration.current
      try {
        const response = await fetch('/api/auth/session', { cache: 'no-store' })
        if (generation !== accountGeneration.current) return

        if (response.status !== 401 && !response.ok) throw new Error('session_unavailable')
        if (!response.ok) {
          setUser(null)
          setDeveloperApps([])
          setTickets([])
          return
        }

        const payload = await response.json()
        const sessionUser = payload.user ?? null

        if (sessionUser?.id) {
          const nextUser = sessionUser
          setUser(nextUser)
          setAuthReady(true)

          await loadDeveloperAppsFor(nextUser.name).catch(() => {})
        } else {
          setUser(null)
          setDeveloperApps([])
          setTickets([])
        }
      } catch {
        if (generation !== accountGeneration.current) return
        setSessionError('بررسی نشست ورود انجام نشد؛ اتصال را بررسی و صفحه را دوباره بارگذاری کنید.')
      } finally {
        if (generation === accountGeneration.current) setAuthReady(true)
      }
    }

    void loadBackendSession()
  }, [loadPublishedApps, loadDeveloperAppsFor])


  const cancelSubmission = useCallback(async (submissionId: string) => {
    const response = await fetch(`/api/developer-hub/submissions/${encodeURIComponent(submissionId)}/cancel`, {
      method: 'POST',
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      if (response.status === 409) await reloadDeveloperApps().catch(() => {})
      if (response.status === 401) window.location.assign('/login?next=/dashboard')
      throw new Error(payload?.message || payload?.detail || 'لغو درخواست انجام نشد.')
    }
    try { await reloadDeveloperApps() } catch { throw new Error('لغو درخواست ثبت شد، اما تازه‌سازی فهرست انجام نشد. دوباره ارسال نکنید؛ فهرست را تازه کنید.') }
  }, [reloadDeveloperApps])

  const updateProfile = useCallback(async (patch: Pick<User, 'firstName' | 'lastName' | 'phone' | 'nationalId' | 'organization'>) => {
    if (!user?.id || logoutPending.current) throw new Error('unauthorized')
    const generation = accountGeneration.current
    const response = await fetch('/api/developer/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: patch.firstName, lastName: patch.lastName, mobile: patch.phone, identityNumber: patch.nationalId, companyName: patch.organization }),
    })
    const payload = await response.json().catch(() => null)
    if (generation !== accountGeneration.current) throw new Error('نشست حساب تغییر کرده است.')
    if (!response.ok || String(payload?.profile?.id) !== String(user.id)) throw new Error(ticketError(payload, 'ذخیره اطلاعات انجام نشد.'))
    setUser(payload.profile)
  }, [user?.id])

  const acceptTerms = useCallback(async () => {
    // Acceptance is managed by backend registration, and is read-only in profile.
    const generation = accountGeneration.current
    const response = await fetch('/api/developer/profile', { cache: 'no-store' })
    const payload = await response.json().catch(() => null)
    if (generation !== accountGeneration.current) throw new Error('نشست حساب تغییر کرده است.')
    if (!response.ok || !payload?.profile?.termsAcceptedAt) throw new Error('پذیرش قوانین باید در فرایند ثبت‌نام ثبت شود؛ با پشتیبانی تماس بگیرید.')
    setUser(payload.profile)
  }, [])
  const reloadTickets = useCallback(async () => {
    const generation = ++ticketGeneration.current
    setTicketsError('')
    try {
      const response = await fetch('/api/developer/tickets', { cache: 'no-store' })
      const payload = await response.json()
      if (generation !== ticketGeneration.current) return
      if (response.status === 401) window.location.assign('/login?next=/dashboard')
      if (!response.ok || !Array.isArray(payload.tickets)) throw new Error(ticketError(payload))
      if (generation === ticketGeneration.current) setTickets(payload.tickets)
    } catch (error) { if (generation === ticketGeneration.current) setTicketsError(error instanceof Error ? error.message : ticketError(null)) }
  }, [])

  const addTicket = useCallback(async (ticket: { subject: string; question: string }) => {
    if (!user?.id || logoutPending.current) throw new Error('نشست ورود معتبر نیست.')
    const generation = accountGeneration.current
    const response = await fetch('/api/developer/tickets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ticket),
    })
    const payload = await response.json().catch(() => null)
    if (generation !== accountGeneration.current) throw new Error('نشست حساب تغییر کرده است.')
    if (response.status === 401) window.location.assign('/login?next=/dashboard')
    if (!response.ok || !payload?.id) throw new Error(ticketError(payload))
    ticketGeneration.current++
    setTickets(prev => [payload, ...prev])
  }, [user?.id])
  const login = useCallback((u: User) => {
    accountGeneration.current++; appGeneration.current++; ticketGeneration.current++
    logoutPending.current = false
    setDeveloperApps([]); setTickets([]); setSessionError(''); setTicketsError('')
    setUser(u); setAuthReady(true)
  }, [])
  const logout = useCallback(async () => {
    const generation = ++accountGeneration.current
    logoutPending.current = true
    ticketGeneration.current++; appGeneration.current++
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      if (generation !== accountGeneration.current) return
      logoutPending.current = false
      setTicketsError('')
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

    let running = false
    let active = true
    const poll = async () => {
      if (running || !active) return
      running = true
      try {
      const results = await Promise.all(processingApps.map(async (app) => {
        try {
          const response = await fetch(
            '/api/developer-hub/submissions/' + encodeURIComponent(app.latestSubmissionId!),
            { cache: 'no-store' },
          )
          if (response.status === 401) window.location.assign('/login?next=/dashboard')
          if (!response.ok) return null
          return await response.json()
        } catch {
          return null
        }
      }))

      if (results.some((submission) => submission && submission.status !== 'processing')) {
        if (active) await loadDeveloperAppsFor(user.name)
      }
      } catch { /* The list error is rendered with a retry control. */ }
      finally { running = false }
    }

    const timer = window.setInterval(() => {
      void poll()
    }, 12000)

    return () => { active = false; window.clearInterval(timer) }
  }, [developerApps, loadDeveloperAppsFor, user])

  const myApps = developerApps
  const value = useMemo(() => ({ apps, user, authReady, sessionError, developerAppsLoading, developerAppsError, publishedAppsLoading, publishedAppsError, updateProfile, acceptTerms, myApps, reloadDeveloperApps, cancelSubmission, tickets, ticketsError, reloadTickets, addTicket, login, logout }), [apps, user, authReady, sessionError, developerAppsLoading, developerAppsError, publishedAppsLoading, publishedAppsError, updateProfile, acceptTerms, myApps, reloadDeveloperApps, cancelSubmission, tickets, ticketsError, reloadTickets, addTicket, login, logout])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() { const ctx = useContext(StoreContext); if (!ctx) throw new Error('useStore باید داخل StoreProvider استفاده شود'); return ctx }

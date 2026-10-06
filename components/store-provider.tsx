'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MOCK_APPS } from '@/lib/mock-data'
import { createClient } from '@/lib/supabase/client'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { StoreApp, SupportTicket, User } from '@/lib/types'

interface StoreContextValue {
  apps: StoreApp[]
  user: User | null
  addApp: (app: StoreApp) => Promise<void>
  updateApp: (id: string, patch: Partial<StoreApp>) => Promise<void>
  updateProfile: (patch: Pick<User, 'name' | 'phone' | 'nationalId' | 'organization'>) => Promise<void>
  addVersion: (appId: string, apk: { pathname: string; name: string }, packageName: string | undefined, changelog: string) => Promise<void>
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
  return { id: row.id, name: row.name, tagline: row.tagline || '', description: row.description || '', category: row.category || 'تکنولوژی و اینترنت', icon: row.icon_path ? `/api/blob-file?pathname=${encodeURIComponent(row.icon_path)}` : row.icon_url || '/placeholder.svg', banner: row.banner_path ? `/api/blob-file?pathname=${encodeURIComponent(row.banner_path)}` : row.banner_url || undefined, screenshots: (row.screenshot_paths || []).map((path: string) => `/api/blob-file?pathname=${encodeURIComponent(path)}`), developer: row.owner_name || 'توسعه‌دهنده', ownerId: row.owner_id || undefined, status: row.status || 'draft', version: '', price: 0, rating: 0, downloads: 0, platforms: [], tags: [], updatedAt: new Date(row.updated_at).toLocaleDateString('fa-IR'), reviews: [], website: row.website || undefined, supportEmail: row.support_email || undefined, packageName: row.package_name || undefined, ageRestriction: row.age_restriction || undefined, apkName: row.apk_name || undefined, apkSize: row.apk_size ? `${row.apk_size} مگابایت` : undefined, apkPath: row.apk_path || undefined, iconPath: row.icon_path || undefined, bannerPath: row.banner_path || undefined, screenshotPaths: row.screenshot_paths || [] }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [apps, setApps] = useState<StoreApp[]>(MOCK_APPS)
  const [user, setUser] = useState<User | null>(null)
  const [tickets, setTickets] = useState<SupportTicket[]>([])

  const loadUserData = useCallback(async (authUser: SupabaseUser | null) => {
    if (!authUser) { setUser(null); setTickets([]); return }
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle()
    const nextUser: User = { id: authUser.id, name: profile?.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'توسعه‌دهنده', email: authUser.email || '', phone: profile?.phone, nationalId: profile?.national_id }
    setUser(nextUser)
    const { data } = await supabase.from('apps').select('*').eq('owner_id', authUser.id).order('created_at', { ascending: false })
    if (data) { const rows = data as Record<string, any>[]; setApps((current) => [...rows.map(mapApp), ...current.filter((app) => !rows.some((row) => row.id === app.id))]) }
    const { data: ticketRows } = await supabase.from('support_tickets').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false })
    if (ticketRows) setTickets(ticketRows.map((row: Record<string, any>) => ({ id: row.id, subject: row.subject, message: row.message, status: row.status, createdAt: new Date(row.created_at).toLocaleDateString('fa-IR'), developer: nextUser.name })))
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data }: { data: { user: SupabaseUser | null } }) => loadUserData(data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => { void loadUserData(session?.user ?? null) })
    return () => listener.subscription.unsubscribe()
  }, [loadUserData])

  const addApp = useCallback(async (app: StoreApp) => {
    if (!user?.id) return
    const { data, error } = await supabase.from('apps').insert({ owner_id: user.id, name: app.name, tagline: app.tagline, description: app.description, category: app.category, age_restriction: app.ageRestriction, package_name: app.packageName, icon_url: app.iconPath ? null : app.icon, banner_url: app.bannerPath ? null : app.banner, website: app.website, support_email: app.supportEmail, status: app.status || 'draft', apk_path: app.apkPath, apk_name: app.apkName, apk_size: app.apkSize ? Number.parseInt(app.apkSize.replace(/[^0-9]/g, ''), 10) : null, icon_path: app.iconPath, banner_path: app.bannerPath, screenshot_paths: app.screenshotPaths || [] }).select().single()
    if (error) throw error
    setApps((prev) => [mapApp({ ...data, owner_name: user.name }), ...prev])
  }, [user])

  const updateApp = useCallback(async (id: string, patch: Partial<StoreApp>) => {
    if (!user?.id) throw new Error('unauthorized')
    const updates: Record<string, unknown> = {
      name: patch.name,
      tagline: patch.tagline,
      description: patch.description,
      category: patch.category,
      age_restriction: patch.ageRestriction,
      website: patch.website,
      support_email: patch.supportEmail,
      updated_at: new Date().toISOString(),
    }

    if (patch.iconPath !== undefined) {
      updates.icon_path = patch.iconPath
      updates.icon_url = null
    }
    if (patch.bannerPath !== undefined) {
      updates.banner_path = patch.bannerPath
      updates.banner_url = null
    }
    if (patch.screenshotPaths !== undefined) {
      updates.screenshot_paths = patch.screenshotPaths
    }

    const { data, error } = await supabase
      .from('apps')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', user.id)
      .select()
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('forbidden_or_missing')
    setApps((prev) => prev.map((app) => app.id === id ? { ...app, ...patch, ...mapApp(data) } : app))
  }, [user?.id])

  const updateProfile = useCallback(async (patch: Pick<User, 'name' | 'phone' | 'nationalId' | 'organization'>) => {
    if (!user?.id) return
    const { error } = await supabase.from('profiles').update({ full_name: patch.name, phone: patch.phone || null, national_id: patch.nationalId || null }).eq('id', user.id)
    if (error) throw error
    setUser((current) => current ? { ...current, ...patch } : current)
  }, [user?.id])
  const addVersion = useCallback(async (appId: string, apk: { pathname: string; name: string }, packageName: string | undefined, changelog: string) => {
    if (!user?.id) throw new Error('unauthorized')
    const { data: ownedApp, error: ownershipError } = await supabase
      .from('apps')
      .select('id')
      .eq('id', appId)
      .eq('owner_id', user.id)
      .maybeSingle()
    if (ownershipError) throw ownershipError
    if (!ownedApp) throw new Error('forbidden_or_missing')

    const { error } = await supabase.from('app_versions').insert({
      app_id: appId,
      apk_path: apk.pathname,
      apk_name: apk.name,
      package_name: packageName || null,
      changelog,
      status: 'pending',
    })
    if (error) throw error
  }, [user?.id])

  const removeApp = useCallback(async (id: string) => {
    if (!user?.id) throw new Error('unauthorized')
    const { data, error } = await supabase
      .from('apps')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id)
      .in('status', ['draft', 'rejected'])
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) throw new Error('forbidden_or_missing')
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
    if (!user?.id) return
    const { data, error } = await supabase.from('support_tickets').insert({ user_id: user.id, subject: ticket.subject, message: ticket.message, status: ticket.status }).select().single()
    if (error) throw error
    setTickets((prev) => [{ id: data.id, subject: data.subject, message: data.message, status: data.status, createdAt: new Date(data.created_at).toLocaleDateString('fa-IR'), developer: user.name }, ...prev])
  }, [user])
  const login = useCallback((u: User) => setUser(u), [])
  const logout = useCallback(async () => { await supabase.auth.signOut(); setUser(null) }, [])
  const myApps = useMemo(() => user?.id ? apps.filter((app) => app.ownerId === user.id) : [], [apps, user?.id])
  const value = useMemo(() => ({ apps, user, addApp, updateApp, updateProfile, addVersion, removeApp, submitAppForReview, getApp, myApps, tickets, addTicket, login, logout }), [apps, user, addApp, updateApp, updateProfile, addVersion, removeApp, submitAppForReview, getApp, myApps, tickets, addTicket, login, logout])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() { const ctx = useContext(StoreContext); if (!ctx) throw new Error('useStore باید داخل StoreProvider استفاده شود'); return ctx }

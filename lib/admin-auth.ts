import { cookies } from 'next/headers'
import { developerApi, authCookieOptions } from '@/lib/developer-api'

export const ADMIN_ACCESS_COOKIE = 'developer_hub_admin_access'
export const ADMIN_REFRESH_COOKIE = 'developer_hub_admin_refresh'

type AdminUser = {
  id: number
  username: string
  firstName: string
  lastName: string
  isStaff: boolean
  isSuperuser: boolean
  canReviewSubmission: boolean
}

async function refreshAdminAccess() {
  const store = await cookies()
  const refresh = store.get(ADMIN_REFRESH_COOKIE)?.value
  if (!refresh) return null

  const response = await developerApi('/api/v1/developer-hub/admin/auth/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || typeof payload.access !== 'string') return null

  try {
    store.set(ADMIN_ACCESS_COOKIE, payload.access, authCookieOptions(Number(payload.expiresIn || 1800)))
  } catch {
    // Server Components cannot mutate cookies; the refreshed token is still valid for this request.
  }
  return payload.access as string
}

export async function setAdminSession(access: string, refresh: string, expiresIn = 1800) {
  const store = await cookies()
  store.set(ADMIN_ACCESS_COOKIE, access, authCookieOptions(expiresIn))
  store.set(ADMIN_REFRESH_COOKIE, refresh, authCookieOptions(12 * 60 * 60))
}

export async function destroyAdminSession() {
  const store = await cookies()
  store.set(ADMIN_ACCESS_COOKIE, '', { path: '/', maxAge: 0 })
  store.set(ADMIN_REFRESH_COOKIE, '', { path: '/', maxAge: 0 })
}

export async function getAdminAccessToken() {
  const store = await cookies()
  return store.get(ADMIN_ACCESS_COOKIE)?.value || await refreshAdminAccess()
}

export async function adminHubApi(path: string, init: RequestInit = {}) {
  let access = await getAdminAccessToken()
  if (!access) {
    return new Response(JSON.stringify({ detail: 'نشست مدیر معتبر نیست.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const makeRequest = (token: string) => developerApi(path, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  let response = await makeRequest(access)
  if (response.status !== 401) return response

  access = await refreshAdminAccess()
  if (!access) return response
  return makeRequest(access)
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const response = await adminHubApi('/api/v1/developer-hub/admin/auth/me/')
  if (!response.ok) return null
  const payload = await response.json().catch(() => null)
  if (!payload?.isStaff && !payload?.isSuperuser) return null
  return payload as AdminUser
}

export async function isAdmin() {
  return Boolean(await getAdminUser())
}

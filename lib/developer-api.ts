import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const DEVELOPER_API_BASE_URL = (
  process.env.DEVELOPER_API_BASE_URL ||
  process.env.HOST_BASE_URL ||
  'https://macil-dev.net-box.ir'
).replace(/\/$/, '')

export const ACCESS_COOKIE = 'developer_access'
export const REFRESH_COOKIE = 'developer_refresh'
export const EMAIL_COOKIE = 'developer_email'

export async function developerApi(path: string, init: RequestInit = {}) {
  const hasBody = init.body != null
  const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
  return fetch(`${DEVELOPER_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(hasBody && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
}

async function refreshDeveloperAccess() {
  const store = await cookies()
  const refresh = store.get(REFRESH_COOKIE)?.value
  if (!refresh) return null

  const response = await developerApi('/api/v1/developers/auth/token/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok || typeof payload.access !== 'string') return null

  store.set(ACCESS_COOKIE, payload.access, authCookieOptions(Number(payload.expiresIn || 1800)))
  return payload.access as string
}

export async function getDeveloperAccessToken() {
  const store = await cookies()
  return store.get(ACCESS_COOKIE)?.value || await refreshDeveloperAccess()
}

export async function developerHubApi(path: string, init: RequestInit = {}) {
  let access = await getDeveloperAccessToken()
  if (!access) {
    return new Response(JSON.stringify({ detail: 'نشست ورود معتبر نیست.' }), {
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

  access = await refreshDeveloperAccess()
  if (!access) return response
  response = await makeRequest(access)
  return response
}

export function copyBackendResponse(response: Response, payload: unknown) {
  const result = NextResponse.json(payload, { status: response.status })
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) result.headers.set('Retry-After', retryAfter)
  return result
}

export function authCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  }
}

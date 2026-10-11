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
  return fetch(`${DEVELOPER_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
    cache: 'no-store',
  })
}

export function copyBackendResponse(response: Response, payload: unknown) {
  return NextResponse.json(payload, { status: response.status })
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

import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'ns_admin_session'

// Derive a deterministic session token from the admin password so we never
// store the raw password in a cookie.
function adminToken() {
  const secret = process.env.SUPABASE_JWT_SECRET || 'ns-admin'
  return createHmac('sha256', secret).update(process.env.ADMIN_PASSWORD || '').digest('hex')
}

export function verifyAdminPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD || ''
  if (!expected) return false
  const a = Buffer.from(input)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function createAdminSession() {
  const store = await cookies()
  store.set(COOKIE_NAME, adminToken(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  })
}

export async function destroyAdminSession() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAdmin() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return false
  const expected = adminToken()
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

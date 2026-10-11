import { createHmac, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export const OWNER_COOKIE = 'developer_owner'

type DeveloperIdentity = {
  id: string
  email: string
}

function signingKey() {
  const key = process.env.DEVELOPER_SESSION_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('developer_session_signing_key_missing')
  return key
}

function signature(payload: string) {
  return createHmac('sha256', signingKey()).update(payload).digest('base64url')
}

export function encodeDeveloperIdentity(identity: DeveloperIdentity) {
  const payload = Buffer.from(JSON.stringify(identity), 'utf8').toString('base64url')
  return `${payload}.${signature(payload)}`
}

export function decodeDeveloperIdentity(value?: string | null): DeveloperIdentity | null {
  if (!value) return null
  const [payload, supplied] = value.split('.')
  if (!payload || !supplied) return null

  const expected = signature(payload)
  const a = Buffer.from(expected)
  const b = Buffer.from(supplied)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as DeveloperIdentity
    if (!parsed.id || !parsed.email) return null
    return { id: parsed.id, email: parsed.email.trim().toLowerCase() }
  } catch {
    return null
  }
}

export async function getDeveloperIdentity() {
  const store = await cookies()
  return decodeDeveloperIdentity(store.get(OWNER_COOKIE)?.value)
}

export async function ensureDeveloperOwner(emailInput: string): Promise<DeveloperIdentity> {
  const email = emailInput.trim().toLowerCase()
  if (!email) throw new Error('developer_email_missing')

  const admin = createAdminClient()
  let existingId = ''

  for (let page = 1; page <= 10 && !existingId; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const found = data.users.find((user) => user.email?.trim().toLowerCase() === email)
    if (found) {
      existingId = found.id
      break
    }
    if (data.users.length < 200) break
  }

  if (!existingId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: `${crypto.randomUUID()}Aa1!`,
      user_metadata: { source: 'developer_backend_identity' },
    })
    if (error || !data.user) throw error || new Error('developer_owner_create_failed')
    existingId = data.user.id
  }

  await admin.from('profiles').upsert({
    id: existingId,
    full_name: email.split('@')[0] || 'توسعه‌دهنده',
  }, { onConflict: 'id' })

  return { id: existingId, email }
}

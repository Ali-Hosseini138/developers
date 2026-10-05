'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type SignupInput = {
  email: string
  password: string
  fullName: string
  phone: string
  nationalId: string
}

// Creates a pre-confirmed account with the service role so users can sign in
// immediately without email verification. Also repairs an existing unconfirmed
// account by confirming it and resetting the password.
export async function registerConfirmedUser(input: SignupInput) {
  const email = input.email.trim().toLowerCase()
  const admin = createAdminClient()

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName, phone: input.phone, national_id: input.nationalId },
  })

  if (!createError && created.user) {
    return { ok: true as const }
  }

  const alreadyExists = createError?.message?.toLowerCase().includes('already') || createError?.status === 422
  if (!alreadyExists) {
    return { ok: false as const, error: createError?.message || 'ثبت‌نام انجام نشد.' }
  }

  // Account exists — find it and make sure it is confirmed with this password.
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users.find((user) => user.email?.toLowerCase() === email)
  if (!existing) {
    return { ok: false as const, error: 'این ایمیل قبلاً ثبت شده است. وارد شوید.' }
  }

  await admin.auth.admin.updateUserById(existing.id, {
    email_confirm: true,
    password: input.password,
    user_metadata: { full_name: input.fullName, phone: input.phone, national_id: input.nationalId },
  })

  return { ok: true as const, existed: true }
}

// Confirms an existing account by email (used to repair accounts created before
// email confirmation was disabled).
export async function confirmExistingUser(email: string) {
  const admin = createAdminClient()
  const { data: list } = await admin.auth.admin.listUsers()
  const existing = list?.users.find((user) => user.email?.toLowerCase() === email.trim().toLowerCase())
  if (!existing) return { ok: false as const, error: 'کاربر یافت نشد.' }
  await admin.auth.admin.updateUserById(existing.id, { email_confirm: true })
  return { ok: true as const }
}

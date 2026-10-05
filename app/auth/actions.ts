'use server'

// Registration is handled with the normal Supabase Auth client in components/auth-form.tsx.
// Do not use the Supabase service-role key for public signup flows: it bypasses RLS and
// must never be used to confirm arbitrary accounts or reset another user's password.

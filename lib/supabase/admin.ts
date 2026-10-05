import { createClient } from '@supabase/supabase-js'

// Service-role client for the admin panel only. NEVER import this in client components.
// It bypasses RLS, so it must stay behind the admin session check.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

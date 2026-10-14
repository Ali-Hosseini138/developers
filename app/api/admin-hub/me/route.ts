import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'

export async function GET() {
  const response = await adminHubApi('/api/v1/developer-hub/admin/auth/me/')
  const payload = await response.json().catch(() => ({}))
  return NextResponse.json(payload, { status: response.status })
}

import { NextResponse } from 'next/server'
import { adminHubApi } from '@/lib/admin-auth'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const allowed = ['page', 'page_size', 'status', 'kind', 'app_id', 'appId', 'search', 'ordering']
  const query = new URLSearchParams()
  for (const key of allowed) {
    const value = url.searchParams.get(key)
    if (value) query.set(key, value)
  }
  const suffix = query.toString() ? `?${query.toString()}` : ''
  const response = await adminHubApi(`/api/v1/developer-hub/admin/submissions/${suffix}`)
  const payload = await response.json().catch(() => ({}))
  const result = NextResponse.json(payload, { status: response.status })
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) result.headers.set('Retry-After', retryAfter)
  return result
}
